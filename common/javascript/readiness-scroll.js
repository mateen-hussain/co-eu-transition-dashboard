export default ($element) =>  {
  const themeId = $element.getAttribute('data-theme-id')

  try {
    let previousThemeId = window.sessionStorage.getItem('themeId') || ''
    if (previousThemeId == themeId) {
      restoreScrollPosition()
    } else {
      sessionStorage.clear();
      window.sessionStorage.setItem('themeId', themeId)
    }
    
    window.addEventListener('scroll', setScrollPosition)

  } catch (exception) {
    new Error('Notice: sessionStorage not available.')
  }
}

const setScrollPosition = () => {
  try {
    window.sessionStorage.setItem('scrollPosition', window.scrollY)
  } catch (exception) {
    new Error('Notice: sessionStorage not available.')
  }
}

const restoreScrollPosition = () => {
  let scrollPosition = window.sessionStorage.getItem('scrollPosition') || 0
  window.scrollTo(0, scrollPosition);
}