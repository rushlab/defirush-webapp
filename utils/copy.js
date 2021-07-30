export function copyToClipboard(text) {
  // if (window && window.clipboardData && window.clipboardData.setData) {
  //   return window.clipboardData.setData("Text", text)
  // }
  return new Promise((resolve, reject) => {
    if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
      let textarea = document.createElement("textarea")
      textarea.textContent = text
      textarea.style.position = "fixed"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
        resolve()
      } catch (err) {
        console.warn("Copy to clipboard failed.", err)
        reject(err)
      } finally {
        document.body.removeChild(textarea)
      }
    } else {
      reject()
    }
  })
}