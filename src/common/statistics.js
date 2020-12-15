// The eugenius function finds a largest sub-array of the most "similar" item in a given array
export function statArray(arr, similarFnc) {
  if (!Array.isArray(arr)) {
    throw "First argument must be an array!";
  }
  if (typeof(similarFnc) !== 'function') {
    throw "Second argument must be an function!";
  }
  const similarArr = [];
  for (let i = 0; i < arr.length; i++) {
    let similar = false;
    for (let j = 0; j < similarArr.length && !similar; j++) {
      if (similarFnc(arr[i], similarArr[j][0])) {
        // arr item is similar to the one in similarArr. add it to similar array item
        similarArr[j].push(arr[i]);
        similar = true;
      }
    }
    if (!similar) {
      // no similar items found, add a new array with this item
      similarArr.push([arr[i]]);
    }
  }
  // find longest similar array
  let longestArr = [];
  for (let j = 0; j < similarArr.length; j++) {
    if (similarArr[j].length > longestArr.length) {
      longestArr = similarArr[j];
    }
  }
  return longestArr.length > 0 ? longestArr : null;
}

function arrLast(arr) {
  if (!arr) {
    return null;
  } else if (!Array.isArray(arr)) {
    throw "Argument must be an array!";
  }

  return arr[arr.length - 1];
}

function arrFirst(arr) {
  if (!arr) {
    return null;
  } else if (!Array.isArray(arr)) {
    throw "Argument must be an array!";
  }

  return arr.length > 0 ? arr[0] : null;
}