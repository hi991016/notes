import LazyLoad from 'vanilla-lazyload'
import barba from '@barba/core'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initMarquee, destroyMarquee } from '@/modules/marquee'
import { lenis, initLenis, stopScroll, startScroll } from '@/modules/lenis'
import { initBgVideo, preloadVideos, destroyBgVideo } from '@/modules/bgVideos'
import { initSvgPlayer } from '@/modules/recipeSvg.js'

//* ==================== CONFIGURATION ====================
const mw = 1024
const CONFIG = {
  isMobile: window.matchMedia(`(max-width: ${mw}px)`)
}

//* ==================== UTILITIES ====================
gsap.registerPlugin(ScrollTrigger)
gsap.registerPlugin(CustomEase)
CustomEase.create('animation-nav', '.3, 0, .3, 1')

let _fadeTriggers = []
let _pendingHash = null
let _menuController = null
let _popupController = null
let _tabsController = null
let _headerScrollHandler = null
let _currentRecipeObserver = null
let _hasRecipePlayed = false
let _recipePopupController = null

//* ==================== FONT LOADING ====================
const waitForFonts = (timeout = 3000) =>
  Promise.race([
    window.__fontsReady ?? document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, timeout))
  ])

//* ==================== LAZY LOAD ====================
const ll = new LazyLoad({
  threshold: 0,
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

//* ==================== INIT HEADER ====================
const initHeader = () => {
  const headerLogo = document.querySelector('[data-header]')
  const triggers = document.querySelector('[data-offset-top]')

  if (!headerLogo || !triggers) return

  // -- reset all header state when entering a new page.
  headerLogo.classList.remove('is-active', 'is-inverted', '--homepage')
  // -- if homepage add class --homepage
  if (document.querySelector('.homepage')) headerLogo.classList.add('--homepage')

  // -- remove the old listener before reconnecting it (to avoid duplication).
  if (_headerScrollHandler) {
    lenis.off('scroll', _headerScrollHandler)
    _headerScrollHandler = null
  }

  const OFFSET = 100
  _headerScrollHandler = ({ scroll }) => {
    headerLogo.classList.toggle('is-active', scroll >= triggers.offsetTop - OFFSET)
  }

  lenis.on('scroll', _headerScrollHandler)
}

//* ==================== INIT MENU ====================
const initMenu = () => {
  // -- reset, abort previous listeners before reassigning
  if (_menuController) _menuController.abort()
  _menuController = new AbortController()
  const { signal } = _menuController

  const [header, menu, menuContainer, menuTogglers, menuLinks] = [
    document.querySelector('[data-header]'),
    document.querySelector('[data-menu]'),
    document.querySelector('[data-menu-container]'),
    document.querySelector('[data-menu-toggler]'),
    document.querySelectorAll('[data-menu] a')
  ]
  if (!menu) return

  const open = () => {
    header.classList.add('is-inverted')
    menuTogglers.classList.add('is-active')
    menu.classList.add('is-show')
    detectOverlay(true)
    setTimeout(() => menuContainer.classList.add('is-show'), 100)
  }

  const close = () => {
    menuTogglers.classList.remove('is-active')
    menuContainer.classList.remove('is-show')
    setTimeout(() => {
      menu.classList.remove('is-show')
      header.classList.remove('is-inverted')
      detectOverlay(false)
    }, 300)
  }

  const toggleMenu = () => (menu.classList.contains('is-show') ? close() : open())

  menuTogglers.addEventListener('click', toggleMenu, { signal })
  menuLinks.forEach((link) => link.addEventListener('click', close, { signal }))
  overlay?.addEventListener('click', close, { signal })
  document.addEventListener('keydown', ({ key }) => key === 'Escape' && close(), { signal })

  // -- hover hamburger menu
  if (CONFIG.isMobile.matches) return
  menuTogglers.addEventListener(
    'mouseenter',
    () => {
      if (menuTogglers.classList.contains('is-active')) {
        menuTogglers.classList.add('hovered')
      }
    },
    { signal }
  )
  menuTogglers.addEventListener(
    'mouseleave',
    () => {
      menuTogglers.classList.remove('hovered')
    },
    { signal }
  )
}

//* ==================== INIT POPUP ====================
const overlay = document.querySelector('[data-overlay]')

const detectOverlay = (shouldBeActive) => {
  overlay.classList.toggle('is-active', shouldBeActive)
  shouldBeActive ? stopScroll() : startScroll()
}

const initFvPopup = () => {
  // -- reset, abort previous listeners before reassigning
  if (_popupController) _popupController.abort()
  _popupController = new AbortController()
  const { signal } = _popupController

  const popup = document.querySelector('[data-fv-popup]')
  if (!popup) return

  const popupToggler = document.querySelector('[data-video-toggler]')
  const videoContainer = popup.querySelector('[data-video-container]')
  const placeholder = popup.querySelector('[data-video-placeholder]')
  const closeBtn = popup.querySelector('[data-video-close]')
  const iframe = popup.querySelector('iframe')

  // -- play: set src + autoplay when user click placeholder
  const playVideo = () => {
    if (videoContainer.classList.contains('is-playing')) return
    const src = iframe.dataset.src
    if (!src) return

    iframe.src = `${src}&autoplay=1`
    videoContainer.classList.add('is-playing')
  }

  // -- stop: remove src, reset placeholder
  const stopVideo = () => {
    iframe.src = ''
    videoContainer.classList.remove('is-playing')
  }

  // -- open / close popup
  const open = () => {
    popup.classList.add('is-active')
    detectOverlay(true)
  }

  const close = () => {
    popup.classList.remove('is-active')
    detectOverlay(false)
    stopVideo()
  }

  // -- events
  placeholder?.addEventListener('click', playVideo, { signal })
  popupToggler?.addEventListener('click', open, { signal })
  closeBtn?.addEventListener('click', close, { signal })
  overlay?.addEventListener('click', close, { signal })
  document.addEventListener('keydown', ({ key }) => key === 'Escape' && close(), { signal })
}

//* ==================== INIT FADE TITLE INTERVIEW PAGE ====================
//? ===== HELPERS =====
const destroyFadeTitles = () => {
  if (_fadeTriggers.length) {
    _fadeTriggers.forEach((t) => t.kill())
    _fadeTriggers = []
  }
}

//? ===== INIT FADE TITLE =====
const initFadeTitles = () => {
  const container = document.querySelector('[data-fade-title]')
  const items = gsap.utils.toArray('[data-fade-title] li')
  const sections = gsap.utils.toArray('[data-title-index]')

  if (!container || !items.length || !sections.length) return

  // -- reset triggers
  destroyFadeTitles()

  let currentIndex = -1
  let isContainerVisible = false

  const goToItem = (index) => {
    if (index === currentIndex) return

    // -- hide the container if you scroll back up to section 1
    if (index === -1) {
      gsap.to(container, { autoAlpha: 0, duration: 0.4 })
      isContainerVisible = false
      currentIndex = index
      return
    }

    // -- show container if is hiding
    if (!isContainerVisible) {
      gsap.to(container, { autoAlpha: 1, duration: 0.4 })
      isContainerVisible = true
    }

    // hide old items
    if (currentIndex !== -1 && items[currentIndex]) {
      const oldElements = items[currentIndex].querySelectorAll('.num, p')
      gsap.to(oldElements, {
        y: -30,
        opacity: 0,
        duration: 0.4,
        stagger: 0.05,
        overwrite: true,
        ease: 'power2.inOut'
      })
      gsap.set(items[currentIndex], { autoAlpha: 0, delay: 0.4 })
    }

    // show new items
    if (items[index]) {
      gsap.set(items[index], { autoAlpha: 1 })
      const newElements = items[index].querySelectorAll('.num, p')

      gsap.fromTo(
        newElements,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.05,
          ease: 'power3.out',
          overwrite: true,
          delay: 0.1
        }
      )
    }

    currentIndex = index
  }

  // -- create scrollTriggers for each section
  sections.forEach((sec, i) => {
    const st = ScrollTrigger.create({
      trigger: sec,
      markers: false,
      start: 'top top+=140',
      end: 'bottom bottom',
      onEnter: () => goToItem(i),
      onEnterBack: () => goToItem(i)
    })
    _fadeTriggers.push(st)
  })

  // -- hide container when scrolling back up to section 1
  const firstSecTrigger = ScrollTrigger.create({
    trigger: sections[0],
    start: 'top 60%',
    onLeaveBack: () => goToItem(-1)
  })
  _fadeTriggers.push(firstSecTrigger)

  // -- hide container when scrolling past the last section's end
  // -- show again when scrolling back up into the last section
  const lastSec = sections[sections.length - 1]
  const lastSecTrigger = ScrollTrigger.create({
    trigger: lastSec,
    markers: false,
    start: 'bottom bottom',
    onEnter: () => {
      gsap.to(container, { autoAlpha: 0, y: -20, duration: 0.5, overwrite: 'auto' })
    },
    onLeaveBack: () => {
      gsap.to(container, { autoAlpha: 1, y: 0, duration: 0.5, overwrite: 'auto' })
    }
  })
  _fadeTriggers.push(lastSecTrigger)
}

//* ==================== INIT RECIPE PAGE ====================
const destroyRecipeSvg = () => {
  if (_currentRecipeObserver) {
    _currentRecipeObserver.disconnect()
    _currentRecipeObserver = null
  }
  _hasRecipePlayed = false
}

const initRecipeSvg = () => {
  const svg = document.getElementById('e7qIbi3ZWJN1')
  if (!svg) return

  destroyRecipeSvg()
  if (!svg.svgatorPlayer) initSvgPlayer()

  const player = svg.svgatorPlayer
  if (!player) return

  player.stop()
  player.pause()

  _currentRecipeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !_hasRecipePlayed) {
          player.play()
          _hasRecipePlayed = true
        }
      })
    },
    {
      threshold: 0.35,
      rootMargin: '-10% 0px -25% 0px'
    }
  )

  _currentRecipeObserver.observe(svg)
}

const initRecipeTabs = () => {
  if (_tabsController) _tabsController.abort()
  _tabsController = new AbortController()
  const { signal } = _tabsController

  const wrapper = document.querySelector('[data-tabs]')
  const contents = document.querySelectorAll('[data-tabs-content]')
  const lists = document.querySelectorAll('[data-tabs-list]')
  const allListButtons = Array.from(lists).map((list) =>
    Array.from(list.querySelectorAll('[data-tabs-item]'))
  )

  if (!allListButtons[0]?.length || !contents.length) return

  allListButtons.forEach((listButtons) => {
    listButtons.forEach((btn, index) => {
      btn.addEventListener(
        'click',
        function () {
          if (btn.classList.contains('is-active')) return

          lenis.scrollTo(wrapper, {
            offset: -80,
            duration: 1.2
          })

          allListButtons.forEach((buttons) =>
            buttons.forEach((b) => b.classList.remove('is-active'))
          )
          contents.forEach((c) => c.classList.remove('is-active'))

          allListButtons.forEach((buttons) => {
            buttons[index]?.classList.add('is-active')
          })
          contents[index]?.classList.add('is-active')
        },
        { signal }
      )
    })
  })
}

const initRecipePopup = () => {
  // -- reset, abort previous listeners before reassigning
  if (_recipePopupController) _recipePopupController.abort()
  _recipePopupController = new AbortController()
  const { signal } = _recipePopupController

  const triggers = document.querySelectorAll('[data-popup-trigger]')

  if (!triggers.length) return

  const getActivePopup = () => document.querySelector('[data-popup].is-active')

  const open = (popupEl) => {
    popupEl.classList.add('is-active')
    detectOverlay(true)
  }

  const close = () => {
    const active = getActivePopup()
    if (!active) return
    active.classList.remove('is-active')
    detectOverlay(false)
    setTimeout(() => {
      active.querySelector('.c-popup_wrap')?.scrollTo({ top: 0 })
    }, 500)
  }

  // -- open: find popup by compound id "01-1" → [data-popup="01-1"]
  triggers.forEach((trigger) => {
    trigger.addEventListener(
      'click',
      () => {
        const popup = document.querySelector(`[data-popup="${trigger.dataset.popupTrigger}"]`)
        if (!popup) return
        open(popup)
      },
      { signal }
    )
  })

  // -- close: close button inside popup
  document.querySelectorAll('[data-popup-close]').forEach((btn) => {
    btn.addEventListener('click', close, { signal })
  })
  overlay?.addEventListener('click', close, { signal })
  document.addEventListener('keydown', ({ key }) => key === 'Escape' && close(), { signal })
}

//* ==================== INIT SCRIPT ====================
const initScript = () => {
  history.scrollRestoration = 'manual'

  ll.update()
  initAppHeight()
  initHeader()
  initMenu()
  initFvPopup()
  initMarquee()
  initFadeTitles()
  initSvgPlayer()
  initRecipeSvg()
  initRecipeTabs()
  initRecipePopup()
}

//* ==================== BARBA ====================
//? ===== HELPERS =====
const delay = (ms = 2000) => new Promise((resolve) => setTimeout(resolve, ms))

//? ===== BARBA HOOKS =====
// -- click "/#intro" from /about/ → _pendingHash = '#intro'
barba.hooks.before((data) => {
  const href = data.next.url.href ?? ''
  const hashIdx = href.indexOf('#')
  _pendingHash = hashIdx !== -1 ? href.slice(hashIdx) : null
})

// -- hash scroll, after Enter on the new page → scroll to the hash
const scrollToHash = (hash) => {
  setTimeout(() => {
    try {
      const target = document.querySelector(hash)
      if (target && lenis) {
        lenis.scrollTo(target, { offset: 0, duration: 1.2, immediate: false })
      }
    } catch (e) {
      console.warn('[barba] hash scroll failed:', hash, e)
    } finally {
      // history.replaceState(null, '', window.location.pathname)
      _pendingHash = null
    }
  }, 100)
}

//? ===== TRANSITION SCREEN =====
const getScreen = () => document.querySelector('[data-transition-screen]')

const pageTransitionIn = (outgoing) => {
  const screen = getScreen()
  const tl = gsap.timeline()

  // block click
  screen.classList.add('is-blocking')

  // kill scroll immediately
  tl.call(() => stopScroll(), null, 0)

  // jump screen to just below viewport, then sweep up to fully cover it
  tl.set('html', { cursor: 'wait' })

  tl.to(screen, { opacity: 1, duration: 0.4, ease: 'animation-nav' }, 0)

  tl.set('html', { cursor: 'auto' })

  return tl
}

const pageTransitionOut = (incoming) => {
  const screen = getScreen()

  // prime new page: starts a bit low + invisible
  // if (incoming) {
  //   gsap.set(incoming, { opacity: 0 })
  // }

  // resume scroll + unblock click once screen has fully exited
  const tl = gsap.timeline({
    onComplete: () => {
      screen.classList.remove('is-blocking')
      startScroll()
    }
  })

  // overlay fade out
  tl.to(screen, { opacity: 0, duration: 0.65, ease: 'animation-nav' }, 0)

  // new page slides up + appears — delay 0.1s for the overlay to lead
  // if (incoming) {
  //   tl.to(
  //     incoming,
  //     {
  //       opacity: 1,
  //       duration: 0.65,
  //       ease: 'power2.inOut'
  //     },
  //     0.1
  //   )
  // }

  return tl
}

const initPageTransitions = () => {
  history.scrollRestoration = 'manual'

  // -- click link barba self add page transition
  const linkSelfs = document.querySelectorAll('[data-barba-prevent]')
  linkSelfs.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const url = link.getAttribute('href')
      if (!url) return
      const tl = pageTransitionIn()
      tl.eventCallback('onComplete', () => {
        window.location.href = url
      })
    })
  })

  // -- barba init
  barba.init({
    // sequential: leave finishes → beforeEnter → enter
    sync: false,
    debug: false,
    timeout: 7000,

    transitions: [
      {
        name: 'default',

        // -- first load: screen opaque → scripts init → fade out reveal
        once(data) {
          const screen = getScreen()
          gsap.set(screen, { opacity: 1 })

          initLenis()
          stopScroll()
          initScript()

          Promise.all([waitForFonts(), preloadVideos(data.next.container)]).then(() => {
            pageTransitionOut(data.next.container)
            initBgVideo(data.next.container)
          })
        },

        // -- leave: fade in overlay, clean up old pages
        async leave(data) {
          await pageTransitionIn(data.current.container)
          if (lenis) lenis.scrollTo(0, { immediate: true })
          destroyBgVideo()
          destroyMarquee()
          destroyFadeTitles()
          destroyRecipeSvg()
          if (lenis) lenis.destroy()
          data.current.container.remove()
        },

        // -- before enter: init a new page while the overlay is hiding.
        async beforeEnter(data) {
          initLenis()
          initScript()
          await preloadVideos(data.next.container)
        },

        // -- enter: fade out overlay reveal new page
        async enter(data) {
          if (lenis) lenis.scrollTo(0, { immediate: true })
          initBgVideo(data.next.container)
          await pageTransitionOut(data.next.container)
          if (_pendingHash) scrollToHash(_pendingHash)
        }
      }
    ]
  })
}

// ===== EVENT LISTENERS =====
window.addEventListener('resize', initAppHeight)
window.addEventListener('DOMContentLoaded', initPageTransitions)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    const screen = getScreen()
    if (screen) gsap.set(screen, { opacity: 0 })
  }
})
