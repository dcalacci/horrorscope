import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import ScaryFaces from '@/components/ScaryFaces'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/video',
      name: 'ScaryFaces',
      component: ScaryFaces
    },
    {
      path: '/',
      name: 'HelloWorld',
      component: HelloWorld
    }
  ]
})
