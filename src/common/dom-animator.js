/**
 * perform CSS transition with the callback once done
 * @param elem DOM element
 * @param styles object like {transition: "all .3s linear", left: "100px"}
 * @param callback
 */
export async function transitionElement(elem, styles, callback = null) {
  if (elem == null || typeof elem !== "object") {
    throw "'elem' should be a DOM element";
  }
  if (styles == null || typeof styles !== "object") {
    throw "'styles' should be an object with style attributes";
  }
  if (!document.body.contains(elem)) {
    throw "'elem' element is not on DOM";
  }

  return new Promise(resolve => {
    function onEnd(ev) {
      elem.removeEventListener("transitionend", onEnd);
      elem.removeEventListener("oTransitionEnd", onEnd);
      elem.removeEventListener("transitionend", onEnd);
      elem.removeEventListener("webkitTransitionEnd", onEnd);

      console.log("transition finished; propertyName=" + ev.propertyName + ", elapsedTime=" + ev.elapsedTime);  //#DEBUG

      if (callback) {
        callback(ev);
      }
      resolve("transitionElement done");
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
  });
}

export async function animateElement(elem, animClassName, callback = null) {
  if (elem == null || typeof elem !== "object") {
    throw "'elem' should be a DOM element";
  }
  if (typeof animClassName !== "string") {
    throw "'animClassName' should be a string with animation class name";
  }
  if (!document.body.contains(elem)) {
    throw "'elem' element is not on DOM";
  }

  return new Promise(resolve => {
    function onEnd(ev) {
      elem.removeEventListener("animationend", onEnd);
      elem.removeEventListener("oanimationend", onEnd);
      elem.removeEventListener("msAnimationEnd", onEnd);
      elem.removeEventListener("webkitAnimationEnd", onEnd);

      elem.classList.remove(animClassName);

      console.log("animation finished; propertyName=" + ev.propertyName + ", elapsedTime=" + ev.elapsedTime);  //#DEBUG

      if (callback) {
        callback(ev);
      }
      resolve("animateElement done");
    }

    elem.addEventListener("animationend", onEnd, false);
    elem.addEventListener("oanimationend", onEnd, false);
    elem.addEventListener("msAnimationEnd", onEnd, false);
    elem.addEventListener("webkitAnimationEnd", onEnd, false);

    // force browser to calculate initial style of the element
    // const computedStyle = window.getComputedStyle(elem, null);
    // for (let styleName in styles) {
    //   void computedStyle.getPropertyValue(styleName);
    // }

    // force browser to render element first, before applying transition result style
    // requestAnimationFrame(() => {
    //   elem.classList.add(animClassName);
    // });

    elem.classList.add(animClassName);
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  if (!document.body.contains(elem1)) {
    throw "'elem1' element is not on DOM";
  }
  if (!document.body.contains(elem2)) {
    throw "'elem2' element is not on DOM";
  }
// these are relative to the viewport, i.e. the window
  const vpOffset1 = elem1.getBoundingClientRect();
  const vpOffset2 = elem2.getBoundingClientRect();
  const dx = vpOffset2.left - vpOffset1.left;
  const dy = vpOffset2.top - vpOffset1.top;
  return {dx: dx, dy: dy};
}