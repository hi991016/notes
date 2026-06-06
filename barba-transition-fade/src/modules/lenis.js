import Lenis from 'lenis'

// ===== INIT LENIS =====
export let lenis

const initLenis = () => {
  if (lenis) lenis.destroy()

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    prevent: (node) => node.closest('[data-lenis-prevent]') !== null
  })

  // # init data-lenis-prevent
  const lenisPreventEls = [...document.querySelectorAll('[data-lenis-prevent-auto]')]
  const syncLenisPrevent = () => {
    lenisPreventEls.forEach((el) => {
      // if content is taller than the container => add data-lenis-prevent so the element can scroll
      el.toggleAttribute('data-lenis-prevent', el.scrollHeight > el.clientHeight)
    })
  }
  syncLenisPrevent()
  const ro = new ResizeObserver(syncLenisPrevent)
  lenisPreventEls.forEach((el) => ro.observe(el))

  const setupBoundaryScroll = (el) => {
    el.addEventListener(
      'wheel',
      (e) => {
        // content fits inside the container - nothing to scroll, skip
        if (el.scrollHeight <= el.clientHeight) return

        const { scrollTop, scrollHeight, clientHeight } = el
        const atTop = scrollTop <= 0
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1

        // block element scrolling when atTop/atBottom, change to Lenis.
        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
          e.stopPropagation()
          e.preventDefault()
          lenis.scrollTo(lenis.targetScroll + e.deltaY, { immediate: false })
        }
      },
      { passive: false }
    )
  }
  lenisPreventEls.forEach(setupBoundaryScroll)

  // # custom scrollbar
  const scrollbarEl = document.querySelector('[data-scrollbar]')
  const scrollBarThumb = document.querySelector('[data-scrollbar-thumb]')

  const updateThumb = () => {
    const ratio = window.innerHeight / document.body.scrollHeight
    scrollBarThumb.style.height = Math.max(ratio * window.innerHeight, 44) + 'px'
  }

  updateThumb()
  new ResizeObserver(updateThumb).observe(document.body)

  // # show/hide scroll activity
  let scrollTimer = null

  lenis.on('scroll', ({ scroll, limit }) => {
    const progress = scroll / limit
    const trackH = scrollbarEl.clientHeight
    const thumbH = scrollBarThumb.clientHeight
    scrollBarThumb.style.top = progress * (trackH - thumbH) + 'px'

    /* show when scroll, hide after 1s when stop */
    document.body.classList.add('is-scrolling')
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => document.body.classList.remove('is-scrolling'), 1000)
  })

  // # drag thumb to scroll
  let isDragging = false
  let dragStartY = 0
  let dragStartScroll = 0

  scrollBarThumb.addEventListener('mousedown', (e) => {
    isDragging = true
    dragStartY = e.clientY
    dragStartScroll = lenis.scroll
    document.body.classList.add('is-dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    const trackH = scrollbarEl.clientHeight
    const thumbH = scrollBarThumb.clientHeight
    const ratio = (e.clientY - dragStartY) / (trackH - thumbH)
    const maxScroll = document.body.scrollHeight - window.innerHeight
    lenis.scrollTo(dragStartScroll + ratio * maxScroll, { immediate: true })
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    document.body.classList.remove('is-dragging')
  })

  function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  return lenis
}

const stopScroll = () => {
  if (lenis) {
    lenis.stop()
    document.body.style.overflow = 'hidden'
  }
}

const startScroll = () => {
  if (lenis) {
    lenis.start()
    document.body.style.overflow = ''
  }
}

export { initLenis, stopScroll, startScroll }
