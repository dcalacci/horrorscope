import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import ScaryFaces from '@/components/ScaryFaces'
import ScaryRecognizer from '@/components/ScaryRecognizer'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'ScaryFaces',
      component: ScaryFaces
    },
    {
      path: '/expressions',
      name: 'ScaryRecognizer',
      component: ScaryRecognizer
    },
  ]
})
