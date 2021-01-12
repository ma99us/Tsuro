export default class LocalStorageService {

  constructor(prefix = null) {
    this.prefix = prefix;
  }

  set(key, value) {
    if (typeof key !== 'string') {
      throw "'key' must be a string";
    }
    key = this.prefix ? this.prefix + '.' + key : key;
    value = LocalStorageService.tryJsonStringify(value);
    window.localStorage.setItem(key, value);
  }

  get(key, defaultValue = null) {
    if (typeof key !== 'string') {
      throw "'key' must be a string";
    }
    key = this.prefix ? this.prefix + '.' + key : key;
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
      return str;
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