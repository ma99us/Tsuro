export default class LocalStorageService {

  set(key, value) {
    if (typeof key !== 'string') {
      throw "'key' must be a string";
    }
    value = LocalStorageService.tryJsonStringify(value);
    window.localStorage.setItem(key, value);
  }

  get(key, defaultValue = null) {
    if (typeof key !== 'string') {
      throw "'key' must be a string";
    }
    let value = window.localStorage.getItem(key);
    value = LocalStorageService.tryJsonParse(value);
    return value || defaultValue;
  }

  static copyToClipboard(text) {
    // create temp element
    const copyElement = document.createElement("span");
    copyElement.appendChild(document.createTextNode(text));
    copyElement.id = 'tempCopyToClipboard';
    document.body.appendChild(copyElement);

    // select the text
    var range = document.createRange();
    range.selectNode(copyElement);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    // copy & cleanup
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    copyElement.remove();
  }

  static tryJsonParse(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  static tryJsonStringify(data) {
    if (data == null || typeof data !== 'object') {
      return data;
    }
    try {
      return JSON.stringify(data);
    } catch (e) {
      return data;
    }
  }
}