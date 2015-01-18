

var PIover2 = Math.PI/2;

function Chunk(size) {
  this.size = size;
  this.length = size*size;
  this.hash = 0;

  //var buffer = new ArrayBuffer(this.length);
  this.view = new Uint8ClampedArray(this.length);
}

Chunk.prototype.index = function(x,y) {
  var X = Math.floor(x), Y = Math.floor(y);
  X = X % this.size; Y = Y % this.size;
  return Y*this.size+X;
};

Chunk.prototype.get = function(x,y) {
  if (arguments.length === 2) {
    x = this.index(x,y);
  }
  return this.view[x]/256;
};

Chunk.prototype.set = function(x,y,z) {
  if (arguments.length === 3) {
    x = this.index(x,y);
  } else {
    z = y;
  }
  this.view[x] = z*255+1;
  this.hash++;
  return this;
};

function perlin(x,y,N) {
  var z = 0, s = 0;
  for (var i = 0; i < N; i++) {
    var pp = 1/(1 << i);   // (1 << i) same as Math.pow(2,i)
    var e = PIover2*pp;  // rotate angle
    var ss = Math.sin(e);
    var cc = Math.cos(e);
    var xx = (x*ss+y*cc);  // rotation
    var yy = (-x*cc+y*ss);
    s += pp; // total amplitude
    z += pp*Math.abs(noise.perlin2(xx/pp,yy/pp));
  }
  return 2*z/s;
}

function PerlinWorld(size, seed, octives) {
  this.seed = seed;
  this.size = size;
  this.octives = octives;

  this.seaLevel = 0.15;
  this.treeLine = 0.75;

  this.chunks = {};
}

PerlinWorld.prototype.getChunkId = function(x,y) {

  var X = Math.floor(x / this.size) % 256;  // chunk
  var Y = Math.floor(y / this.size) % 256;

  return Y*256+X;
};

PerlinWorld.prototype.getChunk = function(x,y) {
  if (arguments.length === 2) {
    x = this.getChunkId(x,y);
  }
  if (!this.chunks[x]) {
    this.chunks[x] = new Chunk(this.size);
  }
  return this.chunks[x];
};

PerlinWorld.prototype._scan = function(x,y) {
  var chunk = this.getChunk(x,y);

  var z = chunk.get(x,y);
  if (z === 0) {
    noise.seed(this.seed);
    z = perlin(x/this.size,y/this.size,this.octives);  // one byte
    chunk.set(x,y,z);
  }
  return z;
};

PerlinWorld.prototype.scan = function(x,y,dx,dy) {
  for (var xi = x; xi < x+dx; xi++) {
    for (var yi = y; yi < y+dy; yi++) {
      this._scan(Math.floor(xi),Math.floor(yi));
    }
  }
};

PerlinWorld.prototype.get = function(x,y) {
  return this.getChunk(x,y).get(x,y);
};

PerlinWorld.prototype.set = function(x,y,z) {
  return this.getChunk(x,y).set(x,y,z);
};

PerlinWorld.prototype.getChunkHash = function(x,y) {
  var id = this.getChunkId(x,y);
  return { id: id, hash: this.getChunk(id).hash};
};

PerlinWorld.prototype.createRGBImage = function(xx,yy) {

  var X = xx - xx % this.size;
  var Y = yy - yy % this.size;

  var data = new Uint8ClampedArray(this.size*this.size*4); // 4 bytes per pixel

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      i = y*this.size+x;
      z = this.get(x+X,y+Y);
      var cell = i * 4;
      data[cell + 1] = z > 0.2 ? 255 : 180; //256*(value+0.40);
      data[cell] = data[cell + 2] = 0;
      if (z == 0) {
        data[cell] = data[cell + 1] = data[cell + 2] = 256;  // white
      } else if (z < this.seaLevel) {
        data[cell] = data[cell + 1] = 0;
        data[cell + 2] = 255;  // blue
      } else if ( z > this.treeLine ) {
        data[cell] = data[cell + 1] = data[cell + 2] = 60;  //black
      }
      data[cell + 3] = 255; // alpha.
    }
  }

  return data;
};

function MainController($scope) {
  var main = this;

  main.size = 60;
  main.seed = 5000;
  main.octives = 5;
  main.time = 0;

  main.hover = '';

  main.seaLevel = 0.15;
  main.treeLine = 0.75;
  main.fogOfWar = false;

  main.clear = clear;
  main.make = newWorld;

  var hashCache = {};

  var canvas = document.getElementsByTagName('canvas')[0];
  var ctx = canvas.getContext('2d');

  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: ((evt.clientX - rect.left)/canvas.offsetWidth*canvas.width)|0,
      y: ((evt.clientY - rect.top)/canvas.offsetHeight*canvas.height)|0
    };
  }

  canvas.addEventListener('mousemove', function(evt) {
    var mousePos = getMousePos(canvas, evt);
    var x = mousePos.x, y = mousePos.y;

    $scope.$apply(function() {
      main.hover = '@' + x + ',' + y;
      main.hover += ' '+main.world.getChunkId(x,y);
      main.hover += ' '+main.world.getChunk(x,y).hash;

      if (main.fogOfWar) {  // scan here
        scanAt(x,y);
        draw();
      }
    });


  }, false);

  canvas.addEventListener('mousedown', function(evt) {
    evt.cancelBubble = true;

    var mousePos = getMousePos(canvas, evt);
    var x = mousePos.x, y = mousePos.y;

    $scope.$apply(function() {
      var z = main.world.get(mousePos.x,mousePos.y);
      z = z + ((evt.shiftKey) ? 0.2 : -0.2);
      z = Math.max(z,0.1);
      main.world.set(x,y,z);
      draw();
    });


  }, true);

  //var chunk = new Chunk(main.size);
  //var world = new PerlinWorld(main.size, main.seed);

  newWorld();
  clear();

  function newWorld() {
    main.world = new PerlinWorld(main.size, main.seed, main.octives);
    canvas.width = main.size*2;
    canvas.height = main.size*2;
  }

  function clear() {
    main.world.seaLevel = main.seaLevel;
    main.world.treeLine = main.treeLine;

    if (!main.fogOfWar) {  // scan all
      scanAll();
    }
    draw(true);
  }

  function scanAll() {
    main.world.scan(0,0,2*main.size,2*main.size);
  }

  function scanAt(x,y) {
    main.world.scan(x-main.size/10,y-main.size/10,2*main.size/10,2*main.size/10);
  }

  function draw(_) {
    for (var x = 0; x < 2; x++) {
      for (var y = 0; y < 2; y++) {
        var X = x * main.size;
        var Y = y * main.size;

        var hash = main.world.getChunkHash(X,Y);

        if (!_ && hashCache[hash.id] && hashCache[hash.id] === hash.hash) { continue; }
        hashCache[hash.id] = hash.hash;
        drawChunk(X,Y);
      }
    }
  }

  function drawChunk(x,y) {
    console.log('draw');

    var start = Date.now();

    var canvas = document.getElementsByTagName('canvas')[0];

    var image = ctx.createImageData(main.size, main.size);
    var data = main.world.createRGBImage(x,y);

    for (var i = 0; i < data.length; i++) {
      image.data[i] = data[i];
    }

    var X = Math.floor(x / main.size) * main.size;
    var Y = Math.floor(y / main.size) * main.size;

    ctx.putImageData(image, X,Y);

    main.time = (Date.now() - start);

    //if(console) {
      //console.log('Generated in ' + main.time + ' ms');
    //}
  }

}

angular.module('app',[])
  .controller('MainController', MainController);
