export function diffObjects(obj0, obj1) {
  const diffs = new Map();

  const equals = (obj0, obj1, path) => {
    if (typeof obj0 !== typeof obj1) {
      // modified property type
      diffs.set('*' + path, obj1);
      return false;
    }
    const type = typeof obj0;
    if (type === 'function') {
      return true;  // ignore functions
    }
    else if (type === 'object') {
      // build array from a unique unity of both object keys
      //const keys = [...new Set([...Object.keys(obj0), ...Object.keys(obj1)])] // unified array of keys in both objects
      let keys = [];
      if (obj0 != null) {
        keys.push(...Object.keys(obj0));
      }
      if (obj1 != null) {
        keys.push(...Object.keys(obj1));
      }
      keys = [...new Set(keys)];

      keys.forEach(key => {
        const path1 = path + '.' + key;
        if ((obj0 == null || obj0[key] == null) && (obj1 != null && obj1[key] != null)) {
          // new property
          diffs.set('+' + path1, obj1[key]);
          return false;
        } else if ((obj0 != null && obj0[key] != null) && (obj1 == null || obj1[key] == null)) {
          // deleted property
          diffs.set('-' + path1, obj0[key]);
          return false;
        } else if (obj0 != null && obj1 != null) {
          return equals(obj0[key], obj1[key], path1); // recursion
        }
      });
    } else if (obj0 !== obj1) {
      // modified primitive
      diffs.set('*' + path, obj1);
      return false;
    } else {
      return true;  // equals primitive
    }
  };

  equals(obj0, obj1, '');

  return diffs;
}

export function diffChildKeys(diffs, prefix, depth = 1) {

  const subPath = (path, depth) => {
    let chunks = path.split('.');
    chunks = chunks.slice(0, depth);
    return chunks.join('.');
  };

  const diffKeys = new Set();
  for (let [k, v] of diffs) {
    if (k.startsWith(prefix)) {
      let remPath = k.substring(prefix.length);
      if (remPath.startsWith('.')) {
        remPath = remPath.substring(1);   // ignore empty chunk
      }
      diffKeys.add(subPath(remPath, depth));
    }
  }

  return [...diffKeys];
}


export function mapToObj(map) {
  const obj = {};
  for (let [k, v] of map) {
    obj[k] = v;
  }
  return obj
}
export function arrayEquals(array1, array2){
  return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
}
