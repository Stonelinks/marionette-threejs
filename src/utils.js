// creates instances
var construct = function(constructor, args) {
  var f = function() {
    return constructor.apply(this, args);
  };
  f.prototype = constructor.prototype;
  return new f();
};

var capitalise = function(string) {
  return string && string.charAt(0).toUpperCase() + string.slice(1);
};
