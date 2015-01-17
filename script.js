

var xs = 100;
var ys = 100;

var buffer = new ArrayBuffer(xs*ys*8);
var uint8View = new Uint8Array(buffer);

function MainController($scope) {
  var main = this;
  
  main.seed = 5000;
  main.octives = 5;
  main.seaLevel = 0.15;
  main.treeLine = 0.75;
  main.times = [0,0];
  
  main.render = draw;
  main.make = make;
  
  main.make();
  main.render();
  
  function perlin(x,y,N) {
    var z = 0, s = 0;
    for (var i = 0; i < N; i++) {
      var p = Math.pow(2,i);
      var e = Math.PI/2/p;
      var ss = Math.sin(e);
      var cc = Math.cos(e)
      var xx = (x*ss+y*cc) / xs * p;
      var yy = (-x*cc+y*ss) / ys * p;
      s += 1/p;
      z += 1/p*Math.abs(noise.perlin2(xx , yy ))
    };
    return z/s*2*255;
  }
  
  function make() {
    
    var start = Date.now();
  
    noise.seed(main.seed);
    
    for (var x = 0; x < xs; x++) {
      for (var y = 0; y < ys; y++) {
        var index = (x + y * xs);
        uint8View[index] = perlin(x,y,main.octives);
      }
    }

    var end = Date.now();
    
    main.times[0] = (end - start);
    if(console) {
      console.log('Generated in ' + main.times[0] + ' ms');
    }
  }
  
  function draw() {
  
    var canvas = document.getElementsByTagName('canvas')[0];
    canvas.width = xs;
    canvas.height = ys;
    
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    var image = ctx.createImageData(canvas.width, canvas.height);
    var data = image.data;
    
    var start = Date.now();
    
    for (var i = 0; i < uint8View.length; i++) {
      z = uint8View[i]/255;
      var cell = i * 4;
      data[cell + 1] = z > 0.2 ? 256 : 180; //256*(value+0.40);
      data[cell] = data[cell + 2] = 0;
      if (z < main.seaLevel) {
        data[cell] = data[cell + 1] = 0;
        data[cell + 2] = 255;  // blue     
      } else if ( z > main.treeLine ) {
        data[cell] = data[cell + 1] = data[cell + 2] = 60;  //black
      }
      data[cell + 3] = 255; // alpha.
    }
    
    var end = Date.now();
    
    ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = false;
    ctx.putImageData(image, 0, 0);
    ctx.translate(0.5, 0.5);
    
    main.times[1] = (end - start);
    if(console) {
      console.log('Generated in ' + main.times[1] + ' ms');
    }
  }
  
}

angular.module('app',[])
  .controller('MainController', MainController);