/**
 * perform CSS transition with the callback once done
 * @param elem DOM element
 * @param styles object like {transition: "all .3s linear", left: "100px"}
 * @param callback
 */
export function transitionElement(elem, styles, callback = null) {
  if (typeof elem !== "object") {
    throw "'elem' should be a DOM element";
  }
  if (typeof styles !== "object") {
    throw "'styles' should be an object with style names";
  }

  function onEnd(ev) {
    elem.removeEventListener("transitionend", onEnd);
    elem.removeEventListener("oTransitionEnd", onEnd);
    elem.removeEventListener("transitionend", onEnd);
    elem.removeEventListener("webkitTransitionEnd", onEnd);

    console.log("transition finished; propertyName=" + ev.propertyName + ", elapsedTime=" + ev.elapsedTime);
    if (callback) {
      callback(ev);
    }
  }

  elem.addEventListener("transitionend", onEnd, false);
  elem.addEventListener("oTransitionEnd", onEnd, false);
  elem.addEventListener("transitionend", onEnd, false);
  elem.addEventListener("webkitTransitionEnd", onEnd, false);

  // force browser to calculate initial style of the element
  const computedStyle = window.getComputedStyle(elem, null);
  for (let styleName in styles) {
    void computedStyle.getPropertyValue(styleName);
  }

  // force browser to render element first, before applying transition result style
  requestAnimationFrame(() => {
    setStyles(elem, styles);
  });
}

/**
 * apply multiple styles to DOM element
 * @param elem
 * @param styles
 */
export function setStyles(elem, styles) {
  if (typeof elem !== "object") {
    throw "'elem' should be a DOM element";
  }
  if (typeof styles !== "object") {
    throw "'styles' should be an object with style names";
  }
  for (let styleName in styles) {
    elem.style[styleName] = styles[styleName];
  }
}

// clear transition styles by names
export function removeStyles(elem, styles) {
  if (!Array.isArray(styles)) {
    throw "'styles' should be an array of js style names";
  }
  styles.forEach((style) => {
    elem.style[style] = '';
  });
}

export function getElementsOffset(elem1, elem2) {
// these are relative to the viewport, i.e. the window
  const vpOffset1 = elem1.getBoundingClientRect();
  const vpOffset2 = elem2.getBoundingClientRect();
  const dx = vpOffset2.left - vpOffset1.left;
  const dy = vpOffset2.top - vpOffset1.top;
  return {dx: dx, dy: dy};
}