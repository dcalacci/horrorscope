

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

export default {
  name: 'ScaryFaces',
  data() {
    return {
      video: {},
      canvas: {},
      captures: []
    }
  },
  mounted() {
    // init detection options
    const minConfidenceFace = 0.5;
    const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });
    
    let loadNet = async () => {
      let detectionNet = faceapi.nets.ssdMobilenetv1;
      //await detectionNet.loadFromUri('/static/weights');
      await detectionNet.load('/static/weights');
      await faceapi.loadFaceExpressionModel('/static/weights');
      return detectionNet;
    };
    
    let onReady = () => {
      console.log('ready', {});
    };
    
    let onExpression = (type) => {
      console.log('expression', { type: type });
    };
    // let notifyRenderer = (command, payload) => {
    //     ipcRenderer.send('window-message-from-worker', {
    //       command: command, payload: payload
    // });
    
    let cam;
    let initCamera = async (width, height) => {
      cam = document.getElementById('cam');
      cam.width = width;
      cam.height = height;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: width,
          height: height
        }
      });
      cam.srcObject = stream;
      return new Promise((resolve) => {
        cam.onloadedmetadata = () => {
          resolve(cam);
        };
      });
      cam.srcObject = stream;
    }
    
    let isReady;
    
    
    const canvas = document.getElementById('overlay')
    const ctx = canvas.getContext('2d')
    console.log("got context:", ctx);
    var text = ctx.measureText('Awesome!')
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.lineTo(50, 102)
    ctx.lineTo(50 + text.width, 102)
    ctx.stroke()
    
    let detectExpressions = async () => {
      
      // const displaySize = { width: cam.width,
      //                       height: cam.height }
      // console.log("dims:", displaySize);
      // // resize the overlay canvas to the input dimensions
      // const canvas = document.getElementById('overlay')
      // faceapi.matchDimensions(canvas, displaySize)
      
      
      let result = await faceapi.detectAllFaces(cam, faceapiOptions)
          .withFaceExpressions()
      
      if(!isReady) {
        isReady = true;
        console.log("Detection is ready!");
        onReady();
      }
      
      if (result) {
        const canvas = $('#overlay').get(0)
        const displaySize = { width: cam.width,
                              height: cam.height }
        const dims = faceapi.matchDimensions(canvas, displaySize, true)
        
        const resizedResult = faceapi.resizeResults(result, dims)
        const minConfidence = 0.05
        
        faceapi.draw.drawDetections(canvas, resizedResult)
//        const resizedResults = faceapi.resizeResults(result, displaySize)
        // draw detections into the canvas
//        faceapi.draw.drawDetections(canvas, resizedResults)
        // draw a textbox displaying the facepressions with minimum probability into the canva
        //console.log("Should be displaying on canvas...")
        // const minProbability = 0.05
        // faceapi.w.drawFaceExpressions(canvas,
        //                                  resizedResults,
        //                                  minProbability)
        // let happiness = 0, anger = 0;
        // if(result.expressions.hasOwnProperty('happy')) {
        //   happiness = result.expressions.happy;
        // }
        // if(result.expressions.hasOwnProperty('angry')) {
        //   anger = result.expressions.angry;
        // }
        // if(happiness > 0.7) {
        //   onExpression('happy');
        // } else if(anger > 0.7) {
        //   onExpression('angry');
        // }
      }
      // was isRunning, not sure why
      if(isReady) {
        detectExpressions();
      }
    };
    
    // resize the detected boxes and landmarks in case your displayed image has a different size than the original
    
    loadNet()
      .then( (net) => { return initCamera(640, 480)})
      .then( (video) => { return detectExpressions() })
    
  },
  methods: { }
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
