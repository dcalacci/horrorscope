<template>
<div class="videoContainer">
  <div class="titletext ">
    <h1> spooky</h1>
    <h1> emoji</h1>
    <h1> horrorscope</h1>
    </div>
    <p v-if="ready" class="horrorscopeText" v-for="emoji in currentEmojis">
      {{emoji}}:
      <br/>
      <span class="horrorText">{{horrorscopes[emoji]}}</span>
    </p>
    <h2 class="horrorscopeText" v-if="!ready"><span class="horrorText">Reading the spooky air, please wait...{{loadingEmoji}}</span></h2>
    
      <canvas id="overlay" />
      <video id="cam" class="video" autoplay muted playsinline></video>
    </div>
</template>

<script>
import '@tensorflow/tfjs';
// implements nodejs wrappers for HTMLCanvasElement, HTMLImageElement, ImageData
import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement, additionally an implementation
// of ImageData is required, in case you want to use the MTCNN
const { Canvas, Image, ImageData } = canvas

//faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
// configure face API
faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img')
});

const emojiHoroscopes = {"👻": "You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "💀": "You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "🕷": "You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "⚰": "You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "🌕":"You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "🎃": "You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away...",
                         
                         "🦇":"You are at your spookiest when you're able to be alone, sometimes even in the same room as other monsters. The past isn't what haunts you; it's the present. Are you floating? Or just surviving? No barriers can hold you, but you might need some ground beneath your feet, lest you float away..." }

const emojis = ["👻", "💀", "🕷","⚰", "🌕","🎃", "🦇",];
let faceMatcher;
let seenFaces = []
let faceEmojiMap = {}

export default {
  name: 'ScaryFaces',
  data() {
    return {
      emojis: ["👻", "💀", "🕷","⚰", "🌕","🎃", "🦇"],
      horrorscopes: emojiHoroscopes,
      ready: false,
      currentEmojis: [],
      faceMatcher: null,
      seenFaces: [],
      faceEmojiMap: {},
      video: {},
      canvas: {},
      captures: [],
      loadingEmoji: ""
    }
  },
  mounted() {
    
    //this.$ls.set("testing", "test!!")
    //console.log("from localstorage:", this.$ls.get("testing"))
    
    
    //let seenFaces = this.$ls.get('seenFaces')
    //let faceEmojiMap = this.$ls.get('faceEmojiMap')
    
    //console.log("read seenFaces:", seenFaces);
    //console.log("loaded seen faces:", seenFaces)
    
    // if (!seenFaces || seenFaces.length < 1) {
    //   console.log("resetting seen faces")
    //   seenFaces = [];
    //   this.$ls.set('seenFaces', [])
    // } else {
    //   console.log("loaded", seenFaces.length, "seen faces:", seenFaces)
    //   this.faceMatcher = new faceapi.FaceMatcher(seenFaces)
    // }
    this.randomLoadingEmoji()
    this.setupVideoElement()
    this.setupFaceDetector()
  },
  methods: {
    isFaceDetectionModelLoaded() {
      return !!faceapi.nets.tinyFaceDetector.params;
    },
    
    setupVideoElement: async function () {
      this.videoEl = document.getElementById('cam')
      console.log("videoEl", this.videoEl);
      // read that doing this helps with mobile
      this.videoEl.setAttribute('autoplay', '');
      this.videoEl.setAttribute('muted', '');
      this.videoEl.setAttribute('playsinline', '');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true})
      this.videoEl.srcObject = stream
      
      this.videoEl.onloadedmetadata = this.onPlay()
    },
    
    setupFaceDetector: async function () {
      await faceapi.nets.tinyFaceDetector.load("/static/weights")
      await faceapi.loadFaceLandmarkModel('/static/weights')
      await faceapi.loadFaceRecognitionModel('/static/weights')
    },
    
    randomLoadingEmoji: function () {
      this.loadingEmoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
      if (!this.ready) {
        console.log("new emoji:", this.loadingEmoji);
        return setTimeout(() => this.randomLoadingEmoji(), 100)
      }
    },
    
    onPlay: async function () {
      if(this.videoEl.paused || this.videoEl.ended || !this.isFaceDetectionModelLoaded())
        return setTimeout(() => this.onPlay())
      
      let inputSize = 160
      let scoreThreshold = 0.5
      
      const modelOptions = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
      
      const results = await faceapi
            .detectAllFaces(this.videoEl, modelOptions)
            .withFaceLandmarks()
            .withFaceDescriptors()
      
      
      this.canvas = document.getElementById('overlay')
      this.ctx = this.canvas.getContext("2d");
      this.dims = faceapi.matchDimensions(this.canvas, this.videoEl, true)
      const resizedResults = faceapi.resizeResults(results, this.dims)
      
      await this.drawEmojis(resizedResults)
      
      this.ready = true;
      
      setTimeout(() => this.onPlay())
    },
    
    drawEmojis: async function (resizedResults) {
      //console.log(">> results:", resizedResults);
      this.currentEmojis = []
      resizedResults.forEach((r) => {
        let detection = r.detection;
        let emoji = this.getFaceEmoji(r);
        this.currentEmojis.push(emoji);
        var box = detection["box"]
        var x = box["topLeft"]["x"] + (box["width"]/2)
        var y = box["topLeft"]["y"] + (box["height"]/2)
        
        var fontSize = 72;
        this.ctx.font = "" + fontSize + "px Arial"
        var text = this.ctx.measureText(emoji);
        
        // find right font size
        while (text.width < box["width"] + 20) {
          this.ctx.font = fontSize + "px Arial"
          text = this.ctx.measureText(emoji);
          fontSize += 12;
        }
        
        // console.log("filling 🎃 @", x, y);
        // console.log("actually @", text, x - (text.width/2), y + (text.height/2));
        this.ctx.fillText(emoji,
                          x - text.width/2,
                          y + text.width/3);
      })
    },
    
    getFaceEmoji: function (result) {
      if (!this.faceMatcher) {
        this.seenFaces.push(result)
        this.faceMatcher = new faceapi.FaceMatcher(this.seenFaces)
      }
      
      let label = this.faceMatcher.findBestMatch(result.descriptor)._label
      // new face
      if (label == 'unknown') {
        this.seenFaces.push(result)
        console.log("new face")
        //this.$ls.set("seenFaces", seenFaces)
        
        //console.log("json added:", encodeJSON(seenFaces));
        this.faceMatcher = new faceapi.FaceMatcher(this.seenFaces)
      }
      
      // find match with new faceMatcher
      label = this.faceMatcher.findBestMatch(result.descriptor)._label
      
      // if we haven't assigned an emoji
      if (!(label in this.faceEmojiMap)) {
        console.log("label not in emoji map...")
        this.faceEmojiMap[label] = this.emojis[Math.floor(Math.random() * this.emojis.length)];
        //this.$ls.set('faceEmojiMap', faceEmojiMap)
      }
      
      return this.faceEmojiMap[label]
    },

    displayEmojiInfo: function (e) {
      console.log("clicked", e.target.innerText);
    }
    
  }
}
</script>

<style>
body {
    background-color: #F0F0F0;
}
#video {
    background-color: #000000;
    z-index: 499;
}
#overlay, .overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 500;
}

.titletext {
    position: absolute;
    top: 0;
    left: 0;
    text-align: left;
    margin-left: 10px;
    z-index: 999;
}
.titletext h1 {
    margin: 0;
    padding: 0;
}

.titletext ul {
    padding-left: 10px;
    margin: 0;
}
.titletext li {
    list-style-type: none;
    padding: 0;
}

.titletext a {
    padding: 0;
    font-size: 1.5em;
    text-decoration: none;
}

.titletext a:hover {
    opacity: 0.8
}


.horrorscopeText {
    font-size: 1.3em;
    font-weight: bold;
    padding-left: 10px;
    max-width: 33%;
    text-align: justify;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 999;
}

@media (max-width : 800px) {
    .horrorscopeText {
        font-size: 1.1em;
        font-weight: bold;
        max-width: 80%;
        text-align: justify;
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 999;
   }
}

.horrorText {
    background-color: #fff;
    opacity: 0.8;
    line-height:1.8;
 }

.video {
        overflow: hidden;
        display: block;
        object-fit: cover;
        width: 100%;
        height: 100%;
        z-index: -999;
    }
    .videoContainer {
        overflow: hidden;
        width: 100vw;
        height: 100vh;
    }
</style>
