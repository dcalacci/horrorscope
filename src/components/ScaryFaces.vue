

<template>
  <div class="videoContainer">
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

const emojis = ["👻", "💀", "🕷","⚰", "🌕","🎃", "🦇",];
let faceMatcher;
let seenFaces = []
let faceEmojiMap = {}

export default {
  name: 'ScaryFaces',
  data() {
    return {
      emojis: ["👻", "💀", "🕷","⚰", "🌕","🎃", "🦇"],
      faceMatcher: null,
      seenFaces: [],
      faceEmojiMap: {},
      video: {},
      canvas: {},
      captures: []
    }
  },
  mounted() {
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
      
      setTimeout(() => this.onPlay())
    },
    
    drawEmojis: async function (resizedResults) {
      console.log(">> results:", resizedResults);
      resizedResults.forEach((r) => {
        let detection = r.detection;
        let emoji = this.getFaceEmoji(r);
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
        //localStorage.setItem("seenFaces", encodeJSON(seenFaces));
        //console.log("json added:", encodeJSON(seenFaces));
        this.faceMatcher = new faceapi.FaceMatcher(this.seenFaces)
      }
      
      // find match with new faceMatcher
      label = this.faceMatcher.findBestMatch(result.descriptor)._label
      
      // if we haven't assigned an emoji
      if (!(label in this.faceEmojiMap)) {
        console.log("label not in emoji map...")
        this.faceEmojiMap[label] = this.emojis[Math.floor(Math.random() * this.emojis.length)];
        //localStorage.setItem("faceEmojiMap", encodeJSON(faceEmojiMap));
      }
      
      return this.faceEmojiMap[label]
    },
    
  }
}
</script>

<style>
body: {
    background-color: #F0F0F0;
}
#app {
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
#video {
    background-color: #000000;
}
#overlay, .overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 999;
}
li {
    display: inline;
    padding: 5px;
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
        width: 90vw;
        height: 90vh;
    }
</style>
