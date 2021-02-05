/**
 * Load html file by name and attach it to the given html element
 * @param elem
 * @param file
 * @returns {Promise<any>}
 */
export async function includeHTML(elem, file) {
  if (elem == null || typeof elem !== "object") {
    throw "'elem' should be a DOM element";
  }
  if (file == null || typeof file !== "string") {
    throw "'file' should be a string file path";
  }

  const htmlToElements = (html) => {
    const template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.childNodes;
  };

  return new Promise((resolve, reject) => {
    /* Make an HTTP request using the attribute value as the file name: */
    const xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          const elems = htmlToElements(this.responseText);
          for (let i = 0; i < elems.length; i++) {
            elem.appendChild(elems[i]);
          }
          resolve("OK: " + file);
        }
        else if (this.status == 404) {
          //elem.innerHTML = "Page not found.";
          reject("Not found: " + file);
        } else{
          reject("Error: " + this.statusText + " loading: " + file);
        }
        /* Remove the attribute, and call this function once more: */
      }
    };
    xhttp.open("GET", file, true);
    xhttp.send();
  });
}

/**
 * EXPERIMENTAL!
 * Look for "data-component" attributes in the document,
 * and try to initialize js classes by name,
 * and load corresponding HTMLs for components.
 * @param comps
 * @returns {Promise<Array>}
 */
export async function loadComponents(comps = []) {
  // Loop through all HTML elements
  const elems = document.getElementsByTagName("*");
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    // search for elements with 'data-component' attributes
    const compName = elem.getAttribute("data-component");   //const comp = elem.dataset.component;
    if (compName) {
      elem.removeAttribute("data-component");
      // construct new component from class name in 'data-component'
      const comp = new window[compName](elem);
      if(comp && typeof comp.init === 'function'){  // comp class has to have init() function!
        // component looks ok, load html template for it and attach to DOM
        try {
          // "data-component' value +'.html' should match component html template file
          await includeHTML(elem, compName + ".html");
          comp.init(elem);
          comps.push(comp);
        } catch (err) {
          throw err;
        }
      }

      await loadComponents(comps); // run again
    }
  }
  return comps;
}