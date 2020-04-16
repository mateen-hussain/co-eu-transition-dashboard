const removeNulls = (obj, maxDepth, currentDepth = -1) => {
  currentDepth ++;

  if(currentDepth === maxDepth) {
    return obj;
  }

  var isArray = obj instanceof Array;

  if(isArray) {
    for (var i = obj.length; i--;) {
      if (typeof obj[i] === "object") {
        obj[i] = removeNulls(obj[i], maxDepth, currentDepth);
        if(!obj[i] || !Object.keys(obj[i]).length) {
          delete obj[i];
        }
      } else if (obj[i] === null || obj[i] === undefined || (typeof obj[i] === "string" && !obj[i].length)) {
        obj.splice(i,1);
      } else if (!isNaN(obj[i])) {
        obj[i] = parseInt(obj[i]);
      }
    }
    if(!obj.length) {
      return undefined;
    }
  } else {
    for (var k in obj){
      if (typeof obj[k] === "object") {
        obj[k] = removeNulls(obj[k], maxDepth, currentDepth);
        if(!obj[k] || !Object.keys(obj[k]).length) {
          delete obj[k];
        }
      } else if (obj[k] === null || obj[k] === undefined || (typeof obj[k] === "string" && !obj[k].length)) {
        delete obj[k];
      } else if (!isNaN(obj[k])) {
        obj[k] = parseInt(obj[k]);
      }
    }
  }

  return obj;
};

const truthy = [true, 'true', 'yes', 1, '1', 'y'];
const falsey = ['false', 'no', '0', 'n'];

module.exports = {
  removeNulls,
  truthy,
  falsey
};