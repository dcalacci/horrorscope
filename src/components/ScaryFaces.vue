

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

      this.drawEmojis(results)
      
      
      setTimeout(() => this.onPlay())
      
      //return results
    },
    
    drawEmojis: async function (results) {
      const canvas = document.getElementById('overlay')
      var ctx = canvas.getContext("2d");
      const dims = faceapi.matchDimensions(canvas, this.videoEl, true)
      const resizedResults = faceapi.resizeResults(results, dims)

      console.log(">> results:", resizedResults);
      
      resizedResults.forEach(({ detection, descriptor }) => {
        let emoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
        var box = detection["box"]
        var x = box["topLeft"]["x"] + (box["width"]/2)
        var y = box["topLeft"]["y"] + (box["height"]/2)
      
        var fontSize = 72;
        ctx.font = "" + fontSize + "px Arial"
        var text = ctx.measureText(emoji);
      
        // find right font size
        while (text.width < box["width"] + 20) {
          ctx.font = fontSize + "px Arial"
          text = ctx.measureText(emoji);
          fontSize += 12;
        }

        // console.log("filling 🎃 @", x, y);
        // console.log("actually @", text, x - (text.width/2), y + (text.height/2));
        ctx.fillText(emoji,
                     x - text.width/2,
                     y + text.width/3);
      })
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
