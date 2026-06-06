import LazyLoad from 'vanilla-lazyload'
import barba from '@barba/core'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { initLenis, stopScroll, startScroll } from '@/modules/lenis'

//* ==================== CONFIGURATION ====================
const mw = 1024
const CONFIG = {
  isMobile: window.matchMedia(`(max-width: ${mw}px)`)
}

//* ==================== UTILITIES ====================
// hash anchor to scroll to after the new page loads
// use to handle clicking "/#intro" from the /about/ page
let _pendingHash = null
let lenis

gsap.registerPlugin(CustomEase)
CustomEase.create('animation-nav', '.3, 0, .3, 1')

//* ==================== FONT LOADING ====================
const waitForFonts = (timeout = 3000) =>
  Promise.race([
    window.__fontsReady ?? document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, timeout))
  ])

//* ==================== LAZY LOAD ====================
const ll = new LazyLoad({
  threshold: 1000,
  elements_selector: '.lazy'
})

//* ==================== INIT APP HEIGHT ====================
const initAppHeight = () => {
  const doc = document.documentElement
  const menuH = Math.max(doc.clientHeight, window.innerHeight || 0)

  if (CONFIG.isMobile.matches) {
    doc.style.setProperty('--app-height', `${doc.clientHeight}px`)
    doc.style.setProperty('--menu-height', `${menuH}px`)
  } else {
    doc.style.removeProperty('--app-height')
    doc.style.removeProperty('--menu-height')
  }
}

//* ==================== INIT PAGE ====================
const initScript = () => {
  history.scrollRestoration = 'manual'
  initAppHeight()
}

//* ==================== BARBA ====================
//? ===== HELPERS =====
const delay = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms))
const transitionOffset = 450

//? ===== PAGE TRANSITIONS =====
const pageTransitionIn = () => {
  const tl = gsap.timeline()

  tl.set('html', { cursor: 'wait' })

  // overlay fade in
  tl.to(
    '[data-transition-screen]',
    {
      duration: 0.4,
      autoAlpha: 1,
      ease: 'animation-nav'
    },
    0
  )

  // overlay fade out
  tl.to(
    '[data-transition-screen]',
    {
      duration: 0.8,
      autoAlpha: 0,
      ease: 'animation-nav'
    },
    0.5
  ).set('html', { cursor: 'auto' }, '=-0.5')

  // nav attr flags
  tl.call(
    () => {
      document
        .querySelector('[data-page-transition]')
        ?.setAttribute('data-page-transition', 'active')
    },
    null,
    0
  )
  tl.call(
    () => {
      document
        .querySelector('[data-page-transition]')
        ?.setAttribute('data-page-transition', 'not-active')
    },
    null,
    0.5
  )

  return tl
}

const pageTransitionOut = () => {
  const nav = document.querySelector('[data-page-transition]')
  const tl = gsap.timeline()

  tl.to('[data-transition-screen]', {
    duration: 0.8,
    autoAlpha: 0,
    ease: 'animation-nav'
  })
  tl.call(() => nav?.setAttribute('data-page-transition', 'not-active'))

  return tl
}

//? ===== BARBA HOOKS =====
// click "/#intro" from /about/ → _pendingHash = '#intro'
barba.hooks.before((data) => {
  const href = data.next.url.href ?? ''
  const hashIdx = href.indexOf('#')
  _pendingHash = hashIdx !== -1 ? href.slice(hashIdx) : null
})

// after Enter on the new page → scroll to the hash
barba.hooks.afterEnter(() => {
  if (!_pendingHash) return

  try {
    const target = document.querySelector(_pendingHash)
    if (target && lenis) {
      setTimeout(() => {
        lenis.scrollTo(target, {
          offset: 0,
          duration: 1.2,
          immediate: false
        })
      }, 300)
    }
  } catch (e) {
    console.warn('[barba] invalid hash target:', _pendingHash, e)
  } finally {
    // history.replaceState(null, '', window.location.pathname)
    _pendingHash = null
  }
})

//? ===== BARBA INIT =====
barba.init({
  sync: true,
  debug: false,
  timeout: 7000,

  transitions: [
    {
      name: 'default',

      // first load: stopScroll → initScript → overlay fade in → set attribute active
      // when font load done → overlay fadeout → startScroll
      once() {
        lenis = initLenis()
        stopScroll()
        initScript()

        gsap.set('[data-transition-screen]', { autoAlpha: 1 })
        document
          .querySelector('[data-page-transition]')
          ?.setAttribute('data-page-transition', 'active')

        waitForFonts().then(() => {
          pageTransitionOut()
          startScroll()
        })
      },

      // leave: stop scroll → overlay fade in → destroy lenis old → remove container old
      async leave(data) {
        stopScroll()
        pageTransitionIn()
        await delay(transitionOffset)
        lenis?.destroy()
        data.current.container.remove()
      },

      // before enter: reinit lenis → reset page state
      async beforeEnter() {
        lenis = initLenis()
        window.scrollTo(0, 0)
        initScript()
      },

      // enter: overlay fadeout → start scroll
      async enter() {
        pageTransitionOut()
        startScroll()
      }
    }
  ]
})

// ===== EVENT LISTENERS =====
window.addEventListener('resize', initAppHeight)
