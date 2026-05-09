/* ./js/script.js of SilusGW-puzzle for puzzle.bauska.org */
"use strict";
// last update: 2026/02/26
let puzzle, autoStart;
let playing;
let useMouse = true;
let lastMousePos;
let ui; // user interface (menu)
const fileExtension = ".puzz";
const fileSignature = "cpzfilecct"; // Just to check reloaded game has a chance to be a good one.

const mhypot = Math.hypot,
  mrandom = Math.random,
  mmax = Math.max,
  mmin = Math.min,
  mround = Math.round,
  mfloor = Math.floor,
  mceil = Math.ceil,
  msqrt = Math.sqrt,
  mabs = Math.abs,
  msin = Math.sin,
  mcos = Math.cos,
  mPI = Math.PI;

const MAT30 = new DOMMatrixReadOnly([
  mcos(mPI / 6),
  msin(mPI / 6),
  -msin(mPI / 6),
  mcos(mPI / 6),
  0,
  0
]);
const MAT45 = new DOMMatrixReadOnly([
  mcos(mPI / 4),
  msin(mPI / 4),
  -msin(mPI / 4),
  mcos(mPI / 4),
  0,
  0
]);
const MAT60 = new DOMMatrixReadOnly([
  mcos(mPI / 3),
  msin(mPI / 3),
  -msin(mPI / 3),
  mcos(mPI / 3),
  0,
  0
]);
const MAT90 = new DOMMatrixReadOnly([0, 1, -1, 0, 0, 0]);
const MAT180 = new DOMMatrixReadOnly([-1, 0, 0, -1, 0, 0]);
const MAT120 = MAT90.multiply(MAT30);
const MAT135 = MAT90.multiply(MAT45);
const MAT150 = MAT90.multiply(MAT60);
const MAT210 = MAT180.multiply(MAT30);
const MAT225 = MAT180.multiply(MAT45);
const MAT240 = MAT180.multiply(MAT60);
const MAT270 = MAT180.multiply(MAT90);
const MAT300 = MAT270.multiply(MAT30);
const MAT315 = MAT270.multiply(MAT45);
const MAT330 = MAT270.multiply(MAT60);

const MATS180 = [, MAT180];
const MATS120 = [, MAT120, MAT240];
const MATS90 = [, MAT90, MAT180, MAT270];
const MATS60 = [, MAT60, MAT120, MAT180, MAT240, MAT300];
const MATS45 = [, MAT45, MAT90, MAT135, MAT180, MAT225, MAT270, MAT315];
const MATS30 = [
  ,
  MAT30,
  MAT60,
  MAT90,
  MAT120,
  MAT150,
  MAT180,
  MAT210,
  MAT240,
  MAT270,
  MAT300,
  MAT330
];

const MATS = [, MATS180, MATS120, MATS90, MATS60, MATS45, MATS30];

//-----------------------------------------------------------------------------
function isMiniature() {
  return location.pathname.includes("/fullcpgrid/"); // special for Codepen
}
//-----------------------------------------------------------------------------
function alea(min, max) {
  // random number [min..max[ . If no max is provided, [0..min[

  if (typeof max == "undefined") return min * mrandom();
  return min + (max - min) * mrandom();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function intAlea(min, max) {
  // random integer number [min..max[ . If no max is provided, [0..min[

  if (typeof max == "undefined") {
    max = min;
    min = 0;
  }
  return mfloor(min + (max - min) * mrandom());
} // intAlea
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function lerp(p0, p1, alpha) {
  return {
    x: p0.x * (1 - alpha) + p1.x * alpha,
    y: p0.y * (1 - alpha) + p1.y * alpha
  };
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function arrayShuffle(array) {
  /* randomly changes the order of items in an array
            only the order is modified, not the elements
            */
  let k1, temp;
  for (let k = array.length - 1; k >= 1; --k) {
    k1 = puzzle.prng.intAlea(0, k + 1);
    temp = array[k];
    array[k] = array[k1];
    array[k1] = temp;
  } // for k
  return array;
} // arrayShuffle
//------------------------------------------------------------------------
/* function below used to generate reproducible sequences of pseudo-random numbers
        one instance is used to create the details of the shapes of the pieces
        so that only the seed of the function needs to be saved for save / restore operations of the puzzle.
        */

/* based on a function found at https://www.grc.com/otg/uheprng.htm
and customized to my needs

use :
  x = mMash('1213'); // returns a resettable, reproducible pseudo-random number generator function
  x = mMash();  // like line above, but uses Math.random() for a seed
  x();         // returns pseudo-random number in range [0..1[;
  x.reset();   // re-initializes the sequence with the same seed. Even if Mash was invoked without seed, will generate the same sequence.
  x.seed;      // retrieves the internal seed actually used. May be useful if no seed or non-string seed provided to Mash
               be careful : this internal seed is a String, even if it may look like a number. Changing or omitting any single digit will produce a completely different sequence
  x.intAlea(min, max) returns integer in the range [min..max[ (or [0..min[ if max not provided)
  x.alea(min, max) returns float in the range [min..max[ (or [0..min[ if max not provided)
*/

/*	============================================================================
            This is based upon Johannes Baagoe's carefully designed and efficient hash
            function for use with JavaScript.  It has a proven "avalanche" effect such
            that every bit of the input affects every bit of the output 50% of the time,
            which is good.	See: http://baagoe.com/en/RandomMusings/hash/avalanche.xhtml
            ============================================================================
        */
/* Seed may be almost anything not evaluating to false. */
function mMash(seed) {
  let n = 0xefc8249d;
  let intSeed = (seed || Math.random()).toString();

  function mash(data) {
    if (data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    } else n = 0xefc8249d;
  }
  mash(intSeed); // initial value based on seed

  let mmash = () => mash("A"); // could as well be 'B' or '!' or any non falsy value
  mmash.reset = () => {
    mash();
    mash(intSeed);
  };
  Object.defineProperty(mmash, "seed", { get: () => intSeed });
  mmash.intAlea = function (min, max) {
    if (typeof max == "undefined") {
      max = min;
      min = 0;
    }
    return mfloor(min + (max - min) * this());
  };
  mmash.alea = function (min, max) {
    // random number [min..max[ . If no max is provided, [0..min[

    if (typeof max == "undefined") return min * this();
    return min + (max - min) * this();
  };

  return mmash;
} // mMash

//------------------------------------------------------------------------
async function saveFile(data, fileName) {
  if (!("showSaveFilePicker" in window) || window.top !== window.self) {
    // showSaveFilePicker, use old donload method
    download(data, fileName, {
      mediaType: "text/plain;charset=utf8",
      preEncoded: false
    });
    return;
  }
  try {
    // Show the file save dialog.
    const pickerOpts = {
      id: "puzz",
      excludeAcceptAllOption: false,
      suggestedName: fileName,
      types: [
        {
          description: "PUZZ file",
          accept: { "text/plain": [".puzz"] }
        }
      ]
    };

    const handle = await showSaveFilePicker(pickerOpts);
    // Write the blob to the file.
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return;
  } catch (err) {
    if (err.name == "AbortError") return; // no message required if user cancelled
    popup(["Something went wrong saving your game.", `Error message: ${err}`]);
  }
} // saveFile
//------------------------------------------------------------------------
function download(data, fileName, options = {}) {
  /* data (string) containing the data to record
               filename (string) the name to give to the file
            */

  /* Based on code found in a pen by Johann Karlsson https://codepen.io/DonKarlssonSan */
  /* proposes to the user to save a file containing data from the program. */

  let mediaType = ""; // no type results in text/plain;charset=US-ASCII
  if (typeof options.mediaType == "string") mediaType = options.mediaType;
  /* mediaType MUST include ';base64' if provided data is base64-encoded. */
  /* mediaType DOES NOT end with a ',' character (appended in program). */

  let preEncoded = false;
  if (typeof options.preEncoded == "boolean") preEncoded = options.preEncoded;

  if (!preEncoded) data = encodeURIComponent(data);

  let element = document.createElement("a");
  element.setAttribute("href", "data:" + mediaType + "," + data);
  element.setAttribute("download", fileName);
  element.style.display = "none";
  document.body.appendChild(element);
  element.addEventListener("click", (e) => e.stopPropagation());
  element.click();
  document.body.removeChild(element);
} // download

//------------------------------------------------------------------------

class Modal {
  constructor(properties) {
    // properties : {lines, buttons}
    // lines : [strings] will be displayed in separate <p> tags
    // buttons :[{text:string, callback(optional):function}]

    let modal = document.createElement("dialog");
    modal.style.borderRadius = "5px";
    if (properties.lines) {
      properties.lines.forEach((line) => {
        const p = document.createElement("p");
        p.append(line);
        modal.append(p);
      });
    }
    if (properties?.buttons?.length > 0) {
      const p = document.createElement("p");
      modal.append(p);
      p.style.display = "flex";
      p.style.justifyContent = "center";
      properties.buttons.forEach((buttonObj) => {
        const button = document.createElement("button");
        button.setAttribute("type", "button");
        button.style.marginRight = "1em";
        button.style.marginLeft = "1em";
        button.innerText = buttonObj.text || "button";
        p.append(button);
        button.addEventListener("click", () => {
          modal.remove();
          modal = null;
          if (buttonObj.callback) buttonObj.callback();
        });
      });
    } else {
      modal.addEventListener("click", () => {
        modal.remove();
        modal = null;
      });
    }
    document.body.append(modal);
    modal.showModal();
  } // constructor
} // class Modal

function popup(lines) {
  // basic Modal with lines of text, and a "close" button - no callback
  new Modal({
    lines: lines,
    buttons: [{ text: "close" }]
  });
} // popup
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// User Interface (controls)
//------------------------------------------------------------------------
function prepareUI() {
  // toggle menu handler
  let menu = document.getElementById("menu");
  let controls = document.getElementById("controls");

  ui = {}; // User Interface HTML elements

  [
    "default",
    "load",
    "rotationstep",
    "shape",
    "nbpieces",
    "start",
    "stop",
    "helpstorage",
    "save",
    "restore",
    "helpfile",
    "fsave",
    "frestore",
    "help",
    "helpstorage",
    "helpfile",
    "saveas",
    "saveext",
    "drawmode",
    "show"
  ].forEach((ctrlName) => (ui[ctrlName] = document.getElementById(ctrlName)));

  ui.open = () => {
    menu.classList.remove("hidden");
    controls.innerHTML = "close controls";
  };
  ui.close = () => {
    menu.classList.add("hidden");
    controls.innerHTML = "open controls";
  };

  ui.waiting = () => {
    ui.default.removeAttribute("disabled");
    ui.load.removeAttribute("disabled");
    ui.shape.removeAttribute("disabled");
    ui.nbpieces.removeAttribute("disabled");
    ui.rotationstep.removeAttribute("disabled");
    ui.start.removeAttribute("disabled");
    ui.stop.setAttribute("disabled", "");
    ui.save.setAttribute("disabled", "");
    ui.restore.removeAttribute("disabled");
    ui.fsave.setAttribute("disabled", "");
    ui.frestore.removeAttribute("disabled");
    ui.show.setAttribute("disabled", "");
  };
  ui.playing = () => {
    ui.default.setAttribute("disabled", "");
    ui.load.setAttribute("disabled", "");
    ui.shape.setAttribute("disabled", "");
    ui.nbpieces.setAttribute("disabled", "");
    ui.rotationstep.setAttribute("disabled", "");
    ui.start.setAttribute("disabled", "");
    ui.stop.removeAttribute("disabled");
    ui.save.removeAttribute("disabled");
    ui.restore.setAttribute("disabled", "");
    ui.fsave.removeAttribute("disabled");
    ui.frestore.setAttribute("disabled", "");
    ui.show.removeAttribute("disabled");
  };

  ui.saveext.innerHTML = fileExtension;
  controls.addEventListener("click", () => {
    // toggle open/close
    if (menu.classList.contains("hidden")) ui.open();
    else ui.close();
  });

  ui.default.addEventListener("click", loadInitialFile);
  ui.load.addEventListener("click", loadFile);
  ui.start.addEventListener("click", startGame);
  ui.stop.addEventListener("click", confirmStop);
  ui.save.addEventListener("click", () => events.push({ event: "save" }));
  ui.restore.addEventListener("click", () => events.push({ event: "restore" }));
  ui.fsave.addEventListener("click", () =>
    events.push({ event: "save", file: true })
  );
  ui.frestore.addEventListener("click", () => {
    loadSaved(); // for Safari, the load file process only works if run from an event listener
    events.push({ event: "restore", file: true });
  });
  ui.help.addEventListener("click", () => popup(helptext));
  ui.helpstorage.addEventListener("click", () => popup(helpstoragetext));
  ui.helpfile.addEventListener("click", () => popup(helpfiletext));
  ui.show.addEventListener("click", () => puzzle.showImage(true));
}
//-----------------------------------------------------------------------------
//------------------------------------------------------------------------

function generatePoints(t) {
  return t.points.map((p) => {
    let obj = { x: p.x, y: p.y }; // shallow copy
    if (p.isCorner) obj.isCorner = true;
    if (p.isEdge) obj.isEdge = true;
    return obj;
  });
} // generate points

//------------------------------------------------------------------------

class SortedArray {
  /* creates a sorted array of any kind of things, by intersting them into an initially empty array
               the comparison function used for sorting is given to the constructor
               Things are inserted using .insert method
               sorted array is in the .tb property of the instance
            */
  /*
            the indexOf property lets you know if thing already existed according to fCompar, and at what index
            just use doInsert(no parameters) after indexOf to insert thing at found (not -1) index
            */

  /* CAUTION : if duplicates are allowed, indexOf is NOT garanteed to return the index of actual thing - only a thing
                  which returns 0 when compared with given thing. Use regular Array.indexOf on instance.tb instead.
            */
  constructor(fCompar, keepDuplicates = false) {
    /* fCompar is the function which will be called to compare the things that will be inserted
                in  this.tb
                    fCompar(a,b) must return  number < 0 if a must be placed before b
                    == 0 if a and b are considered equal
                    > 0 if a must be placed after b
                */
    this.tb = [];
    this.fCompar = fCompar;
    this.keepDuplicates = keepDuplicates;
  }

  indexOf(thing) {
    this.thing = thing;
    // search for place to insert thing, using comparison function this.fCompar
    // if found, returns the index of thing in this.tb, else returns -1
    // sets this.insertAt for future insertion

    let cmp;
    if (this.tb.length == 0) {
      this.insertAt = 0;
      return -1;
    }
    let a = 0,
      c = this.tb.length - 1;
    let b;

    do {
      b = Math.floor((a + c) / 2);
      cmp = this.fCompar(this.tb[b], thing);
      switch (true) {
        case cmp < 0: // thing after b
          if (b == c) {
            // beyond c
            this.insertAt = c + 1;
            return -1;
          }
          if (a == b) ++b; // not to stay on same interval, if its length is 1 or 2
          a = b; // after b : search (b, c) now
          break;
        case cmp == 0:
          this.insertAt = b;
          return b; // found !

        default:
          //thing before b
          if (b == a) {
            // before a
            this.insertAt = a;
            return -1;
          }
          c = b; // search (a, b) now
      }
    } while (true);
  } // indexOf

  doInsert() {
    // DO NOT CALL TWICE WITHOUT getting new (!= -1) indexOf
    this.tb.splice(this.insertAt, 0, this.thing);
  }

  insert(thing) {
    /* inserts thing */
    if (this.indexOf(thing) != -1 && !this.keepDuplicates) return; // already exists and refused
    this.tb.splice(this.insertAt, 0, thing);
  }
} // class SortedArray
//------------------------------------------------------------------------
class Edge {
  constructor(p0, p1) {
    if (p0.kp <= p1.kp) {
      this.p0 = p0;
      this.p1 = p1;
    } else {
      this.p0 = p1;
      this.p1 = p0;
    }
    this.tris = []; // to record up to 2 triangles attached to this edge
  }

  attachTriangle(tri) {
    // includes a triangle in and edge's tris array
    // AND includes itself in this triangle's edges array
    // AND more

    if (!this.p0.tris.includes(tri)) this.p0.tris.push(tri);
    if (!this.p1.tris.includes(tri)) this.p1.tris.push(tri);

    if (!this.p0.edges.includes(this)) this.p0.edges.push(this);
    if (!this.p1.edges.includes(this)) this.p1.edges.push(this);

    if (tri.a == this.p0) {
      if (tri.b == this.p1) {
        this.tris[0] = tri;
        tri.edges[0] = this;
      } else {
        this.tris[1] = tri;
        tri.edges[2] = this;
      }
      return;
    }
    if (tri.b == this.p0) {
      if (tri.c == this.p1) {
        this.tris[0] = tri;
        tri.edges[1] = this;
      } else {
        this.tris[1] = tri;
        tri.edges[0] = this;
      }
      return;
    }
    if (tri.c == this.p0) {
      if (tri.a == this.p1) {
        this.tris[0] = tri;
        tri.edges[2] = this;
      } else {
        this.tris[1] = tri;
        tri.edges[1] = this;
      }
    }
  }
} // class Edge
//------------------------------------------------------------------------
class Triangle {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.vertices = [this.a, this.b, this.c];

    const m11 = 2 * (b.x - a.x);
    const m21 = 2 * (c.x - a.x);
    const m12 = 2 * (b.y - a.y);
    const m22 = 2 * (c.y - a.y);
    const c1 = b.x * b.x - a.x * a.x + b.y * b.y - a.y * a.y;
    const c2 = c.x * c.x - a.x * a.x + c.y * c.y - a.y * a.y;
    const det = m11 * m22 - m21 * m12;
    this.xc = (c1 * m22 - c2 * m12) / det;
    this.yc = (m11 * c2 - m21 * c1) / det;
    this.r = Math.hypot(this.xc - this.a.x, this.yc - this.a.y);
  } // constructor

  inCircumCircle(p) {
    return Math.hypot(p.x - this.xc, p.y - this.yc) < this.r;
  }
  hasEdge(p1, p2) {
    // (was written before the above "Edge" class)
    return (
      (p1 == this.a || p1 == this.b || p1 == this.c) &&
      (p2 == this.a || p2 == this.b || p2 == this.c)
    );
  }
  listTris() {
    let other;
    this.tris = [];
    this.edges.forEach((edge, kEdge) => {
      other = edge.tris[0] == this ? edge.tris[1] : edge.tris[0];
      if (other) this.tris[kEdge] = other;
    });
  } // listTris
} // Triangle
//------------------------------------------------------------------------
class Delaunay {
  /* Delaunay based on based on https://en.wikipedia.org/wiki/Bowyer%E2%80%93Watson_algorithm
   */
  constructor(points, rect) {
    let triangulation, badTriangles, polygon;
    /*
                rect is a rectangle which contains all the points
                */

    /*   triangulation := empty triangle mesh data structure*/
    /* add super-triangle to triangulation // must be large enough to completely contain all the points in pointList */
    /*
                /!\ CAUTION : all triangles generated will have the same orientation as this initial super-triangle
                */
    const numPts = points.length;

    const pts = points; // .map((p, kp) => ({ x: p.x, y: p.y, kp })); // array of points - future vertices
    pts.forEach((p, kp) => (p.kp = kp)); // add index to point
    this.points = pts;
    let supert = [
      { x: rect.p0.x - 1, y: 2 * rect.p1.y - rect.p0.y + 3 }, // points turning clockwise on a JS 2D canvas
      { x: rect.p0.x - 1, y: rect.p0.y - 1 },
      { x: 2 * rect.p1.x - rect.p0.x + 3, y: rect.p0.y - 1 }
    ];
    triangulation = [new Triangle(...supert)];

    /*
                   for each point in pointList do // add all the points one at a time to the triangulation
                */
    for (let kp = 0; kp < numPts; ++kp) {
      let point = pts[kp];

      /*
                          badTriangles := empty set
                    */
      badTriangles = [];
      /*
                          for each triangle in triangulation do // first find all the triangles that are no longer valid due to the insertion
                    */
      for (let kt = 0; kt < triangulation.length; ++kt) {
        if (triangulation[kt].inCircumCircle(point))
          badTriangles.push(triangulation[kt]);
      } // for kt

      polygon = [];
      for (let kt = 0; kt < badTriangles.length; ++kt) {
        let tri = badTriangles[kt];
        if (
          !badTriangles.some(
            (othertri) => othertri !== tri && othertri.hasEdge(tri.a, tri.b)
          )
        )
          polygon.push([tri.a, tri.b]);
        if (
          !badTriangles.some(
            (othertri) => othertri !== tri && othertri.hasEdge(tri.b, tri.c)
          )
        )
          polygon.push([tri.b, tri.c]);
        if (
          !badTriangles.some(
            (othertri) => othertri !== tri && othertri.hasEdge(tri.c, tri.a)
          )
        )
          polygon.push([tri.c, tri.a]);
      } // for kt

      /* remove bad triangles from triangulation */
      for (let kt = 0; kt < badTriangles.length; ++kt) {
        let tri = badTriangles[kt];
        triangulation.splice(triangulation.indexOf(tri), 1);
      } // for kt
      /* add triangulation new triangles built on point and polygon
       */
      polygon.forEach((edge) =>
        triangulation.push(new Triangle(point, edge[0], edge[1]))
      );
    } // points.forEach
    /* remove super-triangle */
    for (let kt = triangulation.length - 1; kt >= 0; --kt) {
      let tri = triangulation[kt];
      if (supert.includes(tri.a)) {
        triangulation.splice(kt, 1);
        continue;
      }
      if (supert.includes(tri.b)) {
        triangulation.splice(kt, 1);
        continue;
      }
      if (supert.includes(tri.c)) {
        triangulation.splice(kt, 1);
        continue;
      }
    }

    this.triangulation = triangulation;
  } // constructor

  //------------------------------------------------------------------------

  analyze() {
    this.points.forEach((p) => {
      p.tris = [];
      p.edges = [];
    });
    this.triangulation.forEach((tri) => (tri.edges = []));

    this.edgesList = new SortedArray((e0, e1) => {
      if (e0.p0.kp - e1.p0.kp) return e0.p0.kp - e1.p0.kp;
      else return e0.p1.kp - e1.p1.kp;
    });

    this.triangulation.forEach((tri) => {
      let ed = new Edge(tri.a, tri.b);
      let kedge = this.edgesList.indexOf(ed);
      if (kedge == -1) this.edgesList.doInsert();
      else ed = this.edgesList.tb[kedge];
      ed.attachTriangle(tri);
      ed = new Edge(tri.b, tri.c);
      kedge = this.edgesList.indexOf(ed);
      if (kedge == -1) this.edgesList.doInsert();
      else ed = this.edgesList.tb[kedge];
      ed.attachTriangle(tri);
      ed = new Edge(tri.c, tri.a);
      kedge = this.edgesList.indexOf(ed);
      if (kedge == -1) this.edgesList.doInsert();
      else ed = this.edgesList.tb[kedge];
      ed.attachTriangle(tri);
    });

    /* sort triangles around every point */

    this.points.forEach((p) => {
      const newEdges = [];
      const newTris = [];
      let edge0, tri;

      if (p.tris.length != p.edges.length) {
        // if point is on edge of complete figure
        edge0 = p.edges.find(
          (edge) =>
            (edge.p0 == p && edge.tris[0] && !edge.tris[1]) ||
            (edge.p1 == p && edge.tris[1] && !edge.tris[0])
        );
        if (edge0 === undefined) edge0 = p.edges[0];
      } else {
        edge0 = p.edges[0];
      }
      while (true) {
        /* find triangle with vertex p and edge edge0 starting from p and turning clockwise */
        newEdges.push(edge0);
        tri = edge0.tris[edge0.p0 == p ? 0 : 1];
        if (tri === undefined) break; // p was on perimeter, reached end
        newTris.push(tri);
        if (newEdges.length == p.edges.length) break; // made full revolution around p
        /* find other side of tri ending at p */
        switch (p) {
          case tri.a:
            edge0 = tri.edges[2];
            break; // ca
          case tri.b:
            edge0 = tri.edges[0];
            break; // ab
          case tri.c:
            edge0 = tri.edges[1];
            break;
        } // switch
      } // while (true)
      p.tris = newTris;
      p.edges = newEdges;
    });
  } // analyze
  drawEdges() {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ffffff80";
    this.edgesList.tb.forEach((edge) => {
      ctx.beginPath();
      ctx.moveTo(edge.p0.x, edge.p0.y);
      ctx.lineTo(edge.p1.x, edge.p1.y);
      ctx.stroke();
    });
  } // drawEdges
  //------------------------------------------------------------------------
} // Delaunay
//------------------------------------------------------------------------
class RdPoint {
  constructor(parent, x, y) {
    /*
                parent is the RandomPoints object for which these RdPoints are constructed
                */
    this.x = x;
    this.y = y;
    this.kx = Math.floor((x - parent.rect.p0.x) / parent.square);
    this.ky = Math.floor((y - parent.rect.p0.y) / parent.square);
  }
  distance(p) {
    return mhypot(this.x - p.x, this.y - p.y);
  } // distance
} // RdPoint
//------------------------------------------------------------------------
class RandomPoints {
  constructor(rect, dist, nbTries) {
    /*
                rect defines a rectangle by top left point p0 and bottom right point p1 : {p0,p1}
                p0 and p1 are defined by x and y coordinates
                creates a set of points in rect with a minimum distance of dist
                nbTries is a heuristic parameter.
                 */

    const genValues = (range) => {
      // generates a list of values from 0 to range, separated by at least this.dist
      let currv = 0;
      const list = [currv];
      let nbTries = 0;
      while (true) {
        let rnd = puzzle.prng();
        let futv = currv + (1 + 0.5 * rnd * rnd) * this.dist; // keep it < 1.5 makes "flat" triangles on edges unlikely
        if (range - futv < this.dist) {
          ++nbTries;
          if (nbTries < 10) continue;
          return list; // finished
        }
        list.push(futv);
        currv = futv;
        if (range - currv < 2 * dist) return list; //
      } // while true
    }; // genValues

    this.rect = rect;
    this.dist = dist;
    this.nbTries = nbTries;

    // create a grid with the right dimensions
    this.square = this.dist;
    this.nbx = mceil((rect.p1.x - rect.p0.x) / this.square);
    this.nby = mceil((rect.p1.y - rect.p0.y) / this.square);

    const terrain = new Array(this.nby + 1)
      .fill(0)
      .map((v, ky) => new Array(this.nbx + 1).fill(0).map((v, kx) => []));
    this.terrain = terrain;
    const points = []; // whole set of points which will be generated
    this.points = points;

    const list = []; // used temporarily to construct points :
    this.list = list;
    // initialize list with points on the perimeter and corners
    // points will be added turning clockwise, which will be useful later to create Polygons on the edges

    let l = genValues(rect.p1.x - rect.p0.x); // along horizontal top side
    l.forEach((v) =>
      this.isAcceptable(new RdPoint(this, rect.p0.x + v, rect.p0.y))
    );

    l = genValues(rect.p1.y - rect.p0.y); // along vertical left side
    l.forEach((v) =>
      this.isAcceptable(new RdPoint(this, rect.p1.x, rect.p0.y + v))
    );

    l = genValues(rect.p1.x - rect.p0.x); // along horizontal bottom side
    l.forEach((v) =>
      this.isAcceptable(new RdPoint(this, rect.p1.x - v, rect.p1.y))
    );

    l = genValues(rect.p1.y - rect.p0.y); // along vertical left side
    l.forEach((v) =>
      this.isAcceptable(new RdPoint(this, rect.p0.x, rect.p1.y - v))
    );

    for (let k = 0; k < list.length; ++k) {
      if (
        (list[k].x == rect.p0.x || list[k].x == rect.p1.x) &&
        (list[k].y == rect.p0.y || list[k].y == rect.p1.y)
      )
        list[k].isCorner = true;
      else list[k].isEdge = true;
    }

    while (list.length) {
      let posp = puzzle.prng.intAlea(list.length);
      let p = list[posp];
      let found = false;

      for (let k = 0; k < nbTries; ++k) {
        let p1 = this.rndr2r(); // number >= dist, but not too much
        p1 = new RdPoint(this, p.x + p1.x, p.y + p1.y);
        if (this.isAcceptable(p1)) {
          found = true;
        }
      } // for k
      if (!found) list.splice(posp, 1);
    } // while list.length

    delete this.terrain;
    // add each RdPoint its index in "points"
    points.forEach((p, k) => {
      p.kList = k;
      delete p.kx; // no longer needed
      delete p.ky;
    });
  } // constructor

  rndr2r() {
    /* returns a random point at a distance from origin between this.dist and 2 * this.dist
     */
    //                    const r = this.dist * msqrt(1 + 3 * Math.random());  // that's the key for constant density!
    let rnd = puzzle.prng();
    rnd *= rnd;
    const r = this.dist * (1 + 0.7 * rnd); // rnd ^ 2 : higher density at lower radius
    const th = Math.PI * puzzle.prng() * 2;
    return { x: r * Math.cos(th), y: r * Math.sin(th) };
  } // rndr2r

  isAcceptable(p) {
    if (
      p.x < this.rect.p0.x ||
      p.x > this.rect.p1.x ||
      p.y < this.rect.p0.y ||
      p.y > this.rect.p1.y
    )
      return false; // out of rect !
    loop2: for (
      let kky = mmax(0, p.ky - 1);
      kky <= mmin(p.ky + 1, this.nby);
      ++kky
    ) {
      for (
        let kkx = mmax(0, p.kx - 1);
        kkx <= mmin(p.kx + 1, this.nbx);
        ++kkx
      ) {
        if (this.terrain[kky][kkx].some((pp) => p.distance(pp) < this.dist))
          return false;
      } // for kkx
    } // for kky
    // this point is acceptable
    this.terrain[p.ky][p.kx].push(p); // record new point
    this.list.push(p);
    this.points.push(p);
    return true;
  }
} // RandomPoints
//------------------------------------------------------------------------
class Polygon {
  /* this is the class for basic (unconnected) pieces of a puzzle */
  constructor(tr, kp, lastkp) {
    /* p is a point in a Delaunay triangulation */
    let p = (this.p = tr.points[kp]);
    p.polygon = this;
    if (kp <= lastkp) {
      this.vertices = [];
      if (p.isCorner) this.vertices.push(p);
      p.tris.forEach((tri, k) => {
        if (k == 0) {
          this.vertices.push(p.p1);
        }
        this.vertices.push(tri.gc);
        if (k == p.tris.length - 1) {
          this.vertices.push(tr.points[kp == 0 ? lastkp : kp - 1].p1);
        }
      });
      //* choice for point C
      this.c = {};
      if (p.isCorner) {
        let pa = this.vertices[1];
        if (pa.x !== p.x) {
          this.c.x = (this.vertices.at(-1).x + this.vertices.at(-2).x) / 2;
          this.c.y = (this.vertices[1].y + this.vertices[2].y) / 2;
        } else {
          this.c.x = (this.vertices[1].x + this.vertices[2].x) / 2;
          this.c.y = (this.vertices.at(-1).y + this.vertices.at(-2).y) / 2;
        }
      } else {
        this.c = {
          x:
            (this.vertices[0].x +
              this.vertices[1].x +
              this.vertices.at(-2).x +
              this.vertices.at(-1).x) /
            4,
          y:
            (this.vertices[0].y +
              this.vertices[1].y +
              this.vertices.at(-2).y +
              this.vertices.at(-1).y) /
            4
        };
      }
    } else {
      // "normal" polygon
      this.vertices = p.tris.map((tri) => tri.gc);
      this.c = {
        x: this.vertices.reduce((s, v) => s + v.x, 0) / this.vertices.length,
        y: this.vertices.reduce((s, v) => s + v.y, 0) / this.vertices.length
      };
    }
  } // constructor
} // class Polygon

//------------------------------------------------------------------------
//-----------------------------------------------------------------------------

function makeSaveFileName(src) {
  /* builds a name suitable for a file (without extension) base on input string.
            the input string is supposed to be an url with a "http" or "https" protocol, or a text that can reasonably be converted to a filename
            if it is an url, it is parsed to keep the last portion of its path name (after the last "/")
            the extension part (after the last "." if any) is stripped
            this names is copied to the user interface "save name" input field
            */
  if (URL.canParse(src)) {
    src = URL.parse(src).pathname;
    // keep last part of pathname
    src = src.split("/").at(-1); // keep only part after last("/")
  } // if canParse
  src = src.trim();
  if (src.length == 0) src = "save";
  // strip extension if any
  let lsti = src.lastIndexOf(".");
  if (lsti != -1) src = src.substring(0, lsti);
  src = src.trim();
  if (src.length == 0) src = "save";
  // very elementary cleaning
  let nname = "";
  for (let k = 0; k < src.length; ++k) {
    const c = src.charAt(k);
    if (
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-".indexOf(
        c
      ) != -1
    )
      nname += c;
    else nname += "_";
  }
  ui.saveas.value = nname;
  return nname;
} // makeSaveFileName

//-----------------------------------------------------------------------------
function startGame() {
  events.push({ event: "nbpieces", nbpieces: Number(ui.nbpieces.value) });
}
function confirmStop() {
  if (!playing) return; // ignore if not playing
  new Modal({
    lines: ["Are you sure you want to stop this game ?"],
    buttons: [
      { text: "stop", callback: () => events.push({ event: "stop" }) },
      { text: "continue" }
    ]
  });
}
//------------------------------------------------------------------------
const helptext = [
  "Thank you for playing my jigsaw puzzle game.",
  "You can play with a default picture, or load any jpeg, png or other kind of picture from your computer.",
  "Pick a rotation step for the pieces, from none to 12 steps by turn. Rotate the pieces by clicking/tapping them. Pieces will rotate counter-clockwise if the shift key is held down during rotation.",
  "Choose from the different piece shapes available.",
  "Choose the number of pieces. This is not an accurate value, depending on the dimensions of your picture, the exact number of pieces may be slightly different.",
  "You can zoom in and out with the mouse wheel or by pinching, or with the keyboard keys Ctrl + and Ctrl -.",
  "You can move the whole game at a time in any direction by touching the surface outside of any piece, and moving around. Combined with the zoom feature, this gives you access to a virtually unlimited game area.",
  "Last, you can save a game in progress, and restore it later. Two methods are proposed, see individual help buttons for details."
];

const helpstoragetext = [
  "With this method, the game is saved in your browser's data.",
  "This method is fast - really a one-click action - but with a few drawbacks.",
  "Although it is very popular, this method is not available on some devices.",
  "Only one game can be saved at a time: every saved game replaces the previous one.",
  "Furthermore, this method can fail, with locally loaded images bigger than a few Mb. A message will be issued in case of failure"
];

const helpfiletext = [
  'This method stores the saved game in your download folder. Use the "save name" field to save different games with different names.',
  "On some devices, you are not limited to the download folder: you will be prompted for the destination folder and name."
];
//------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function getTransformMatrix(orgx, orgy, scale, rot, destx, desty) {
  const mat = new DOMMatrix([1, 0, 0, 1, destx, desty]);
  if (rot) mat.multiplySelf(puzzle.rotMat[rot]);
  mat.scaleSelf(scale, scale);
  return mat.translateSelf(-orgx, -orgy);
} //
//-----------------------------------------------------------------------------
// one side of a piece
class Side {
  constructor(type, points) {
    this.type = type || ""; // "d" pour straight line or "z" pour classic
    this.points = points || []; // real points or Bezier curve points
  } // Side

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  reversed() {
    // returns a new Side, copy of current one but reversed
    const ns = new Side();
    ns.type = this.type;
    ns.points = this.points.slice().reverse();
    return ns;
  } // Side.reversed

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /*
            draws the path corresponding to a side
            Parameters :
              path : path2D or ctx where the path will be drawn
              first : true to begin with moveTo, false to continue already begun path
            */
  drawNormPath(path, first) {
    // raw draw in path
    if (first) {
      path.moveTo(this.points[0].x, this.points[0].y);
    }
    if (this.type == "d") {
      path.lineTo(this.points[1].x, this.points[1].y);
    } else {
      // edge zigzag
      for (let k = 1; k < this.points.length - 1; k += 3) {
        path.bezierCurveTo(
          this.points[k].x,
          this.points[k].y,
          this.points[k + 1].x,
          this.points[k + 1].y,
          this.points[k + 2].x,
          this.points[k + 2].y
        );
      } // for k
    } // if jigsaw side
  } // Side.drawNormPath
} // class Side
//-----------------------------------------------------------------------------
/* modifies a side
  changes it from a straight line (type "d") to a complex one (type "z")
  The change is done towards the opposite vertex (ca)
*/
function twist0(side, ca) {
  const sp = side.points;
  const dxh = sp[1].x - sp[0].x;
  const dyh = sp[1].y - sp[0].y;
  const lsegh = mhypot(dxh, dyh);
  if (lsegh < puzzle.distPoints * 0.4) return; // do not twist short edges ( 0.4 * distPoints is an arbitrary limit)
  const mid0 = lerp(sp[0], sp[1], 0.5);

  const dxv = ca.x - mid0.x;
  const dyv = ca.y - mid0.y;
  const lsegv = mhypot(dxv, dyv);
  let scalev = puzzle.prng.alea(1.5, 2);
  const scaleh = puzzle.prng.alea(1, 1.3);

  // limitation of ratio
  const alpha = 2;
  if (scalev * lsegv > alpha * scaleh * lsegh)
    scalev = (alpha * scaleh * lsegh) / lsegv;
  if (scalev * lsegv < 0.5 * scaleh * lsegh) return;

  const mid = puzzle.prng.alea(0.45, 0.55);

  const pa = pointAt(mid - (1 / 12) * scaleh, (1 / 12) * scalev);
  const pb = pointAt(mid - (1.8 / 12) * scaleh, (2.8 / 12) * scalev);
  const pc = pointAt(mid, (4 / 12) * scalev);
  const pd = pointAt(mid + (1.8 / 12) * scaleh, (2.8 / 12) * scalev);
  const pe = pointAt(mid + (1 / 12) * scaleh, (1 / 12) * scalev);

  side.points = [
    sp[0],
    {
      x: sp[0].x + (5 / 12) * dxh * 0.52,
      y: sp[0].y + (5 / 12) * dyh * 0.52
    },
    {
      x: pa.x - (1 / 12) * dxv * 0.72,
      y: pa.y - (1 / 12) * dyv * 0.72
    },
    pa,
    {
      x: pa.x + (2 / 12) * dxv * 0.92,
      y: pa.y + (2 / 12) * dyv * 0.92
    },

    {
      x: pb.x - (1 / 12) * dxv * 0.92,
      y: pb.y - (1 / 12) * dyv * 0.92
    },
    pb,
    {
      x: pb.x + (1 / 12) * dxv * 0.92,
      y: pb.y + (1 / 12) * dyv * 0.92
    },
    {
      x: pc.x - (2 / 12) * dxh * 0.7,
      y: pc.y - (2 / 12) * dyh * 0.7
    },
    pc,
    {
      x: pc.x + (2 / 12) * dxh * 0.7,
      y: pc.y + (2 / 12) * dyh * 0.7
    },
    {
      x: pd.x + (1 / 12) * dxv * 0.92,
      y: pd.y + (1 / 12) * dyv * 0.92
    },
    pd,
    {
      x: pd.x - (1 / 12) * dxv * 0.92,
      y: pd.y - (1 / 12) * dyv * 0.92
    },
    {
      x: pe.x + (2 / 12) * dxv * 0.92,
      y: pe.y + (2 / 12) * dyv * 0.92
    },
    pe,
    {
      x: pe.x - (1 / 12) * dxv * 0.72,
      y: pe.y - (1 / 12) * dyv * 0.72
    },
    {
      x: sp[1].x - (5 / 12) * dxh * 0.52,
      y: sp[1].y - (5 / 12) * dyh * 0.52
    },
    sp[1]
  ];
  side.type = "z";

  function pointAt(coeffh, coeffv) {
    return {
      x: sp[0].x + coeffh * dxh + coeffv * dxv,
      y: sp[0].y + coeffh * dyh + coeffv * dyv
    };
  } // pointAt
} // twist0
//-----------------------------------------------------------------------------
/* modifies a side
          changes it from a straight line (type "d") to a complex one (type "z")
          The change is done towards point ca
        */
function twist1(side, ca) {
  const sp = side.points;

  const dxh = sp[1].x - sp[0].x;
  const dyh = sp[1].y - sp[0].y;
  const lsegh = mhypot(dxh, dyh);
  if (lsegh < puzzle.distPoints * 0.4) return; // do not twist short edges ( 0.4 * distPoints is an arbitrary limit)
  const mid0 = lerp(sp[0], sp[1], 0.5);

  const dxv = ca.x - mid0.x;
  const dyv = ca.y - mid0.y;
  //            const lsegv = mhypot(dxv, dyv);

  const pa = pointAt(
    puzzle.prng.alea(0.15, 0.35),
    puzzle.prng.alea(-0.05, 0.05)
  );
  const pb = pointAt(puzzle.prng.alea(0.45, 0.55), puzzle.prng.alea(0.3, 0.5));
  const pc = pointAt(
    puzzle.prng.alea(0.65, 0.85),
    puzzle.prng.alea(-0.05, 0.05)
  );

  side.points = [
    sp[0],
    sp[0],
    pa,
    pa,
    pa,
    pb,
    pb,
    pb,
    pc,
    pc,
    pc,
    sp[1],
    sp[1]
  ];
  side.type = "z";

  function pointAt(coeffh, coeffv) {
    return {
      x: sp[0].x + coeffh * dxh + coeffv * dxv,
      y: sp[0].y + coeffh * dyh + coeffv * dyv
    };
  } // pointAt
} // twist1
//-----------------------------------------------------------------------------
/* modifies a side
          changes it from a straight line (type "d") to a complex one (type "z")
          The change is done towards point ca
        */
function twist2(side, ca) {
  const sp = side.points;

  const dxh = sp[1].x - sp[0].x;
  const dyh = sp[1].y - sp[0].y;
  //            const lsegh = mhypot(dxh, dyh);
  //            if (lsegh < (puzzle.distPoints * 0.4)) return; // do not twist short edges ( 0.4 * distPoints is an arbitrary limit)
  const mid0 = lerp(sp[0], sp[1], 0.5);

  const dxv = ca.x - mid0.x;
  const dyv = ca.y - mid0.y;

  const hmid = puzzle.prng.alea(0.45, 0.55);
  const vmid = puzzle.prng.alea(0.4, 0.5);
  const pc = pointAt(hmid, vmid);

  const pb = lerp(sp[0], pc, 2 / 3);
  const pd = lerp(sp[1], pc, 2 / 3);

  side.points = [sp[0], pb, pd, sp[1]];
  side.type = "z";

  function pointAt(coeffh, coeffv) {
    return {
      x: sp[0].x + coeffh * dxh + coeffv * dxv,
      y: sp[0].y + coeffh * dyh + coeffv * dyv
    };
  } // pointAt
} // twist2
//-----------------------------------------------------------------------------
/* modifies a side
        this one does not, in fact
        */
function twist3() {} // twist3

//-----------------------------------------------------------------------------

function twist4(side, ca, cb) {
  const sp = side.points;

  const pa0 = lerp(sp[0], ca, 0.13);
  const pa1 = lerp(sp[1], ca, 0.13);
  const pb0 = lerp(sp[0], cb, 0.13);
  const pb1 = lerp(sp[1], cb, 0.13);
  side.points = [
    sp[0],
    lerp(sp[0], sp[1], 0.25),
    lerp(pa0, pa1, 0.33 - 0.1),
    lerp(pa0, pa1, 0.33),
    lerp(pa0, pa1, 0.33 + 0.1),
    lerp(pb0, pb1, 0.67 - 0.1),
    lerp(pb0, pb1, 0.67),
    lerp(pb0, pb1, 0.67 + 0.1),
    lerp(sp[1], sp[0], 0.25),
    sp[1]
  ];
  side.type = "z";
} // twist4

//--------------------------------------------------------------
//--------------------------------------------------------------
class PolyPiece {
  // represents a group of pieces well positionned with respect  to each other.
  constructor(initialPiece) {
    this.pieces = [initialPiece];
    initialPiece.poly = this; // remember the polypiece this piece belongs to
    this.selected = false;
    this.minx = initialPiece.minx;
    this.maxx = initialPiece.maxx;
    this.miny = initialPiece.miny;
    this.maxy = initialPiece.maxy;
    this.pCentre = {
      x: (this.minx + this.maxx) / 2,
      y: (this.miny + this.maxy) / 2
    };
    this.diagonal = mhypot(this.maxx - this.minx, this.maxy - this.miny);
    this.listLoops();
    this.getSrcPath();
    this.getNormIntPath();
    this.rot = 0; // PolyPiece is in "normal" position - 1 for 90 deg.cw, 2 and 3 for 180 and 270 deg
  } // PolyPiece.constructor

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
  /*
              this method
                - adds pieces of otherPoly to this PolyPiece
                - adjusts coordinates of new pieces to make them consistent with this polyPiece
                - re-evaluates the z - index of the polyPieces
            */

  merge(otherPoly) {
    // remove otherPoly from list of polypieces
    const kOther = puzzle.polyPieces.indexOf(otherPoly);
    puzzle.polyPieces.splice(kOther, 1);

    for (let k = 0; k < otherPoly.pieces.length; ++k) {
      otherPoly.pieces[k].poly = this;
      this.pieces.push(otherPoly.pieces[k]);
    } // for k

    if (otherPoly.minx < this.minx) this.minx = otherPoly.minx;
    if (otherPoly.maxx > this.maxx) this.maxx = otherPoly.maxx;
    if (otherPoly.miny < this.miny) this.miny = otherPoly.miny;
    if (otherPoly.maxy > this.maxy) this.maxy = otherPoly.maxy;
    this.pCentre = {
      x: (this.minx + this.maxx) / 2,
      y: (this.miny + this.maxy) / 2
    };
    this.diagonal = mhypot(this.maxx - this.minx, this.maxy - this.miny);

    this.listLoops();
    this.getSrcPath();
    this.getNormIntPath();

    puzzle.evaluateOrder();
  } // merge

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -
  ifNear(otherPoly) {
    if (this.rot != otherPoly.rot) return false; // different orientations, can't collapse!

    let p1, p2;

    if (mhypot(this.x - otherPoly.x, this.y - otherPoly.y) >= puzzle.dConnect)
      return false; // not close enough

    // this and otherPoly are in good relative position, have they a common side ?
    // in fact, a single point is enough
    const sides = this.tbLoops.flat();
    const sides1 = otherPoly.tbLoops.flat();
    for (let ks = 0; ks < sides1.length; ++ks) {
      const sd = sides1[ks];
      if (sides.find((es) => es.points[0] == sd.points.at(-1))) return true;
    }

    // nothing matches

    return false;
  } // ifNear

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

  /* algorithm to determine the boundary of a PolyPiece
              input : a table of cells, hopefully defining a 'good' PolyPiece, i.e. all connected together
              returned value : table of Loops, because the boundary may be made of several
            simple loops : there may be a 'hole' in a PolyPiece
            every loop is a list of consecutive sides
            */

  listLoops() {
    const tbLoops = []; // for the result
    const tbEdges = []; // set of edges which are not shared by 2 pieces of input
    let lp; // for loop during its creation
    let currEdge; // current edge
    let edgeNumber; // number of edge found during research

    // create list of not shared edges (=> belong to boundary)
    this.pieces.forEach((pc1) => {
      pc1.sides.forEach((side, k) => {
        if (side.polys.length == 2) {
          let other = side.polys[0] == pc1 ? side.polys[1] : side.polys[0];
          if (other?.poly == this) return; // this side is common inside this polypiece
        }
        tbEdges.push(pc1.sideLines[k]);
      }); // for kEdge
    }); // for k

    while (tbEdges.length > 0) {
      lp = []; // new loop
      currEdge = tbEdges.shift(); // we begin with first available edge
      lp.push(currEdge); // add it to loop
      do {
        edgeNumber = tbEdges.findIndex(
          (ed) => ed.points[0] == currEdge.points.at(-1)
        );
        if (edgeNumber == -1) break; // finished loop
        currEdge = tbEdges.splice(edgeNumber, 1)[0]; // new current edge
        lp.push(currEdge); // add it to loop
      } while (1); // do-while exited by break
      tbLoops.push(lp); // add this loop to loops list
    } // while tbEdges...
    this.tbLoops = tbLoops;
  } // polyPiece.listLoops
  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
  getSrcPath() {
    // returns an array of paths defined on a normalized image
    this.srcPath = new Path2D();
    let pth;
    this.tbLoops.forEach((loop) => {
      pth = new Path2D();
      loop.forEach((side, k) => {
        side.drawNormPath(pth, k == 0);
      });
      this.srcPath.addPath(pth);
    });
    return this.srcPath;
  } // getSrcPath
  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
  getNormIntPath() {
    // returns a path made of all the internal edges
    this.normIntPath = new Path2D();
    let edg = this.tbLoops.flat();
    this.pieces.forEach((pc, kk) => {
      pc.sides.forEach((side, kk) => {
        if (edg.includes(pc.sideLines[kk])) return; // this side in tbLoops
        if (pc == side.polys[0]) side.drawNormPath(this.normIntPath, true);
      });
    });
    return this.normIntPath;
  } // getNormIntPath
  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
  setTransforms() {
    this.fromSrcMatrix = getTransformMatrix(
      0,
      0,
      puzzle.scale,
      this.rot,
      this.x,
      this.y
    );
  } // setTransforms

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

  drawImage(special) {
    this.setTransforms(); // may be not the best place to do this.

    let pth = new Path2D();
    pth.addPath(this.srcPath, this.fromSrcMatrix);
    this.playPath = pth; //

    let pa = this.fromSrcMatrix.transformPoint({
      x: this.minx - this.diagonal / 2,
      y: this.miny - this.diagonal / 2
    });
    let pb = this.fromSrcMatrix.transformPoint({
      x: this.maxx + this.diagonal / 2,
      y: this.maxy + this.diagonal / 2
    });

    if (
      mmax(pa.x, pb.x) < 0 ||
      mmax(pa.y, pb.y) < 0 ||
      mmin(pa.x, pb.x) > puzzle.contWidth ||
      mmin(pa.y, pb.y) > puzzle.contHeight
    )
      return; // not on screen
    let ctx = puzzle.playCtx;
    if (this.isMoving) {
      ctx = puzzle.moveCtx;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    ctx.strokeStyle = "#000";

    // make shadow
    ctx.fillStyle = "none";
    ctx.shadowColor = this.selected
      ? special
        ? "lime"
        : "gold"
      : "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = this.selected
      ? mmin(8, (puzzle.distPoints * puzzle.scale) / 10)
      : 4;
    ctx.shadowOffsetX = this.selected ? 0 : -4;
    ctx.shadowOffsetY = this.selected ? 0 : 4;
    ctx.fill(pth);
    if (this.selected) for (let k = 0; k < 6; ++k) ctx.fill(pth);
    ctx.shadowColor = "rgba(0, 0, 0, 0)"; // stop shadow effect

    ctx.save();
    ctx.clip(pth);

    ctx.setTransform(this.fromSrcMatrix);
    ctx.drawImage(puzzle.srcImage, 0, 0);
    ctx.resetTransform();
    const dxemboss = puzzle.embossThickness / 2;
    const dyemboss = -puzzle.embossThickness / 2;

    if (puzzle.drawMode == 3) {
      // individual emboss on each piece
      ctx.restore();
      this.pieces.forEach((pc) => {
        let pthi = new Path2D();
        pthi.addPath(pc.srcPath, this.fromSrcMatrix);
        ctx.save();
        ctx.clip(pthi);
        drawEmboss(ctx, pthi);
        ctx.restore();
      });
    } else {
      drawEmboss(ctx, pth); // global emboss on polypiece
      if (puzzle.drawMode == "1") drawInternal(ctx, this);
      ctx.restore();
    }

    function drawEmboss(ctx, path) {
      ctx.lineWidth = puzzle.embossThickness * 1.5;
      ctx.translate(dxemboss, dyemboss);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.stroke(path);

      ctx.translate(-2 * dxemboss, -2 * dyemboss);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.stroke(path);
    } // drawEmboss

    function drawInternal(ctx, pp) {
      let pth = new Path2D();
      pth.addPath(pp.normIntPath, pp.fromSrcMatrix);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ffffff";
      let sv = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "difference";
      ctx.stroke(pth);
      ctx.globalCompositeOperation = "sv";
    }
  } // drawImage

  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this.setTransforms();
  } //

  rotate(angle) {
    let pCenterDisp = this.fromSrcMatrix.transformPoint(this.pCentre);
    /* angle = orientation : 0 to n (depends on choice of number of steps/turn  */
    this.rot = angle;
    const mtrx = getTransformMatrix(
      this.pCentre.x,
      this.pCentre.y,
      puzzle.scale,
      this.rot,
      pCenterDisp.x,
      pCenterDisp.y
    );
    // make a fake "moveTo" to compensate for the displacement of the center of the polypiece
    this.x = mtrx.e;
    this.y = mtrx.f;
    //  notice : another"setTransforms" will have to be done since this.x and this.y have been changed
  }
  isPointInPath(p) {
    return puzzle.playCtx.isPointInPath(this.playPath, p.x, p.y);
  } // isPointInPath
} // class PolyPiece

//-----------------------------------------------------------------------------
class Puzzle {
  /*
                params contains :

            container : mandatory - given by id (string) or element
                        it will not be resized in this script

            ONLY ONE Puzzle object should be instanced.
                only "container is mandatory, nbPieces and pictures may be provided to get
                initial default values.
                When a puzzle is solved (and even if not solved) another game can be played
                by changing the image file or the number of pieces, NOT by invoking new Puzzle
            */

  constructor(params) {
    this.autoStart = false;

    this.container =
      typeof params.container == "string"
        ? document.getElementById(params.container)
        : params.container;

    /* the following code will add the event Handlers several times if
                  new Puzzle objects are created with same container.
                  the presence of previous event listeners is NOT detectable
                */
    this.container.addEventListener("mousedown", (event) => {
      useMouse = true;
      event.preventDefault();
      if (event.button != 0) return; //only left button involved
      events.push({
        event: "touch",
        position: this.relativeMouseCoordinates(event)
      });
    });
    this.container.addEventListener(
      "touchstart",
      (event) => {
        useMouse = false;
        event.preventDefault();
        if (event.touches.length == 0) return;
        const rTouch = [];
        if (event.touches.length == 0) return;
        for (let k = 0; k < event.touches.length; ++k) {
          rTouch[k] = this.relativeMouseCoordinates(event.touches.item(k));
        }
        if (event.touches.length == 1)
          events.push({ event: "touch", position: rTouch[0] });
        if (event.touches.length == 2) {
          // will be used for zoom in/out
          events.push({ event: "touches", touches: rTouch });
        }
      },
      { passive: false }
    );

    this.container.addEventListener("mouseup", (event) => {
      useMouse = true;
      event.preventDefault();
      if (event.button != 0) return; // ignore if releasing right click
      handleLeave(event); // transmit shift key used to rotate ccw
    });
    this.container.addEventListener("touchend", handleLeave);
    this.container.addEventListener("touchleave", handleLeave);
    this.container.addEventListener("touchcancel", handleLeave);

    this.container.addEventListener("mousemove", (event) => {
      useMouse = true;
      event.preventDefault();
      // do not accumulate move events in events queue - keep only current one
      if (events.length && events[events.length - 1].event == "move")
        events.pop();
      events.push({
        event: "move",
        position: this.relativeMouseCoordinates(event),
        ev: event
      });
    });
    this.container.addEventListener(
      "touchmove",
      (event) => {
        useMouse = false;
        event.preventDefault();
        const rTouch = [];
        if (event.touches.length == 0) return;
        for (let k = 0; k < event.touches.length; ++k) {
          rTouch[k] = this.relativeMouseCoordinates(event.touches.item(k));
        }
        if (event.touches.length == 1) {
          // do not accumulate move events in events queue - keep only current one
          if (events.length && events[events.length - 1].event == "move")
            events.pop();
          events.push({ event: "move", position: rTouch[0] });
        }
        if (event.touches.length == 2) {
          // do not accumulate move events in events queue - keep only current one
          if (events.length && events[events.length - 1].event == "moves")
            events.pop();
          events.push({ event: "moves", touches: rTouch });
        }
      },
      { passive: false }
    );

    this.container.addEventListener("wheel", (event) => {
      useMouse = true;
      event.preventDefault();
      if (events.length && events.at(-1).event == "wheel") events.pop(); // avoid multiple consecutive wheel events
      events.push({ event: "wheel", wheel: event });
    });
    const KDINSTALLED = "kdinstalledcct5874"; // to prevent double installation
    if (!(KDINSTALLED in document.body.dataset)) {
      document.body.addEventListener("keydown", (event) => {
        if ((event.key != "+" && event.key != "-") || !event.shiftKey) return; // not for us, ignore
        // if zoom by keybord, imitate a mouse event
        event.preventDefault();
        if (events.length && events.at(-1).event == "wheel") events.pop(); // avoid multiple consecutive wheel events
        events.push({
          event: "wheel",
          wheel: { deltaY: event.key == "+" ? 1 : -1 },
          center: { x: puzzle.contWidth / 2, y: puzzle.contHeight / 2 }
        });
      });
      document.body.dataset[KDINSTALLED] = "1"; // value is not significant
    }
    this.srcImage = new Image();
    this.imageLoaded = false;
    this.srcImage.addEventListener("load", () => imageLoaded());

    function handleLeave(event) {
      events.push({ event: "leave", shiftKey: event.shiftKey }); //
    }
  } // Puzzle

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  getContainerSize() {
    let styl = window.getComputedStyle(this.container);

    /* dimensions of container */
    this.contWidth = parseFloat(styl.width);
    this.contHeight = parseFloat(styl.height);
  }

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  showImage(state) {
    // enforces display (true) or hide (false)
    puzzle.showState = state == undefined ? !puzzle.showState : !!state;
    let showElem = puzzle.container.querySelector(".showimage");
    if (!showElem) {
      showElem = document.createElement("div");
      showElem.classList.add("showimage");
      showElem.addEventListener("click", () => puzzle.showImage(false)); // close on first click
      puzzle.container.append(showElem);
    }
    /* showElem is created only once. Its content is destroyed and re-created at every invocation */
    showElem.innerHTML = "";
    if (puzzle.showState) {
      ui.close(); // menu no longer needed
      showElem.style.display = "block";
      let img = document.createElement("img");
      showElem.append(img);
      img.src = puzzle.srcImage.src;
    } else {
      // hide
      showElem.style.display = "none";
    }
  }
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // used to initialize new or restored game

  create(baseData) {
    this.prng = mMash(baseData ? baseData[2] : "a"); // pseudo-random number generator used to create the pieces
    this.container.innerHTML = ""; // forget contents

    this.playCanvas = document.createElement("canvas");
    this.container.append(this.playCanvas);
    this.playCtx = this.playCanvas.getContext("2d");
    this.playCanvas.style.position = "absolute";

    this.moveCanvas = document.createElement("canvas");
    this.container.append(this.moveCanvas);
    this.moveCtx = this.moveCanvas.getContext("2d");
    this.moveCanvas.style.position = "absolute";

    this.getContainerSize();
    this.moveCanvas.width = this.playCanvas.width = this.contWidth;
    this.moveCanvas.height = this.playCanvas.height = this.contHeight;

    if (baseData) {
      this.typeOfShape = baseData[4];
      ui.shape.value = Number(baseData[3]) + 1;

      // retrieve list of pieces with their vertices
      this.distPoints = baseData[0];
      this.scale = baseData[1];
      this.rotationStep = baseData[3];
      ui.rotationstep.value = this.rotationStep;
      this.prng = mMash(baseData[2]); // pseudo-random number generator used to create the pieces
      this.makePolygons();
    } else {
      this.typeOfShape = document.getElementById("shape").value - 1;
      this.distPoints = msqrt(this.srcWidth * this.srcHeight) / 10;
      this.rotationStep = parseInt(ui.rotationstep.value, 10);

      do {
        this.prng = mMash(); // pseudo-random number generator used to create the pieces
        this.makePolygons();

        if (
          mabs(1 - this.pieces.length / this.nbPieces) <= 0.01 ||
          mabs(this.pieces.length - this.nbPieces) <= 2
        )
          break; // right nb of pieces
        this.distPoints *= mmax(
          0.67,
          mmin(1.5, msqrt(this.pieces.length / this.nbPieces))
        );
      } while (true);
    }
    this.nbPiecesAct = this.pieces.length;
    this.rotMat = MATS[this.rotationStep];
    this.nbRot = [, 2, 3, 4, 6, 8, 12][this.rotationStep];

    /* create minx,maxx, miny,maxy for all polygons - just to have a rough idea of their overall size */
    this.pieces.forEach((piece) => {
      piece.minx = piece.vertices.reduce(
        (min, vert) => mmin(min, vert.x),
        Infinity
      );
      piece.maxx = piece.vertices.reduce(
        (max, vert) => mmax(max, vert.x),
        -Infinity
      );
      piece.miny = piece.vertices.reduce(
        (min, vert) => mmin(min, vert.y),
        Infinity
      );
      piece.maxy = piece.vertices.reduce(
        (max, vert) => mmax(max, vert.y),
        -Infinity
      );
    });
    this.defineShapes({
      coeffDecentr: 0.12,
      twistf: [twist0, twist1, twist2, twist3, twist4][this.typeOfShape]
    });

    this.polyPieces = [];
    if (!baseData) {
      // build 1-piece polyPieces with random orientation if allowed, and stack in random order
      this.pieces.forEach((piece) =>
        this.polyPieces.push(new PolyPiece(piece, this))
      );
      arrayShuffle(this.polyPieces);
      if (this.rotationStep)
        puzzle.polyPieces.forEach((pp) => (pp.rot = intAlea(this.nbRot)));
    } else {
      // re-create Polypieces as described in baseData
      const pps = baseData[7];
      const offs = this.rotationStep ? 3 : 2; // offset to reach kx of 1st piece
      pps.forEach((ppData) => {
        let polyp = new PolyPiece(this.pieces[ppData[offs]]);
        polyp.x = ppData[0];
        polyp.y = ppData[1];
        polyp.rot = this.rotationStep ? ppData[2] : 0;
        for (let k = offs + 1; k < ppData.length; k++) {
          // add other pieces to polypiece
          polyp.pieces.push(this.pieces[ppData[k]]);
          this.pieces[ppData[k]].poly = polyp;
          if (this.pieces[ppData[k]].minx < polyp.minx)
            polyp.minx = this.pieces[ppData[k]].minx;
          if (this.pieces[ppData[k]].maxx > polyp.maxx)
            polyp.maxx = this.pieces[ppData[k]].maxx;
          if (this.pieces[ppData[k]].miny < polyp.miny)
            polyp.miny = this.pieces[ppData[k]].miny;
          if (this.pieces[ppData[k]].maxy > polyp.maxy)
            polyp.maxy = this.pieces[ppData[k]].maxy;
        }
        polyp.pCentre = {
          x: (polyp.minx + polyp.maxx) / 2,
          y: (polyp.miny + polyp.maxy) / 2
        };
        polyp.listLoops();
        polyp.getSrcPath();
        polyp.getNormIntPath();
        this.polyPieces.push(polyp);
      });
    }
    this.evaluateOrder();
  } // Puzzle.create

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  drawPolyPieces(butTop) {
    this.playCtx.clearRect(0, 0, this.playCanvas.width, this.playCanvas.height);
    let max = this.polyPieces.length - (butTop ? 1 : 0);
    for (let k = 0; k < max; ++k) this.polyPieces[k].drawImage();
  } // drawPolyPieces

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  defineShapes(shapeDesc) {
    let { coeffDecentr, twistf } = shapeDesc;

    let np;

    for (const piece of this.pieces) {
      piece.sideLines = [];
      piece.sides.forEach((side, k) => {
        if (!side.processed) {
          if (side.polys.length == 2) {
            // if side on perimeter : leave it a straight line
            let cs = [side.polys[0].c, side.polys[1].c];
            if (this.prng.intAlea(2)) cs = [cs[1], cs[0]];
            twistf(side, cs[0], cs[1]);
            side.processed = true;
          }
        }
        piece.sideLines[k] =
          side.points[0] == piece.vertices[k] ? side : side.reversed();
      });
      piece.srcPath = new Path2D();
      piece.sideLines.forEach((sln, k) => {
        sln.drawNormPath(piece.srcPath, k == 0);
      });
      piece.srcPath.closePath();
    } // for piece
  } // Puzzle.defineShapes

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  doScale() {
    /* computes the distance below which two pieces connect
                  depends on the actual size of pieces, with lower limit */
    this.dConnect = mmax(10, (this.scale * this.distPoints) / 10);

    /* computes the thickness used for emboss effect */
    // from 2 (scalex = 0)  to 4 (scalex = 200), not more than 4
    this.embossThickness = mmin(
      2 + ((this.scale * this.distPoints) / 200) * (4 - 2),
      4
    );
    this.polyPieces.forEach((pp) => pp.setTransforms());
  }
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  sweepBy(dx, dy) {
    this.polyPieces.forEach((pp) => {
      pp.moveTo(pp.x + dx, pp.y + dy);
    });
    this.drawPolyPieces();
  } // Puzzle.sweepBy
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  zoomBy(coef, center) {
    // coef if a multiplier coefficient (1= no change, 0..1 = shrink, >1 = enlarge)
    // center is not moved by the zoom

    let futWidth = this.srcWidth * this.scale * coef;
    let futHeight = this.srcHeight * this.scale * coef;
    let nsize = msqrt((futWidth * futWidth) / this.pieces.length); // roughly, size of a piece

    // limits
    if (
      ((nsize > 1000 || futWidth > 10000 || futHeight > 10000) && coef > 1) ||
      (nsize < 10 && coef < 1)
    )
      return;
    if (coef == 1) return; // nothing to do;

    this.scale *= coef;
    this.doScale();
    this.polyPieces.forEach((pp) => {
      // translate to new place
      pp.moveTo(
        coef * (pp.x - center.x) + center.x,
        coef * (pp.y - center.y) + center.y
      );
    });
    this.drawPolyPieces();
  } // Puzzle.zoomBy
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  relativeMouseCoordinates(event) {
    /* takes mouse coordinates from mouse event
                  returns coordinates relative to container, even if page is scrolled or zoommed */

    const br = this.container.getBoundingClientRect();
    lastMousePos = {
      x: event.clientX - br.x,
      y: event.clientY - br.y
    };
    return lastMousePos;
  } // Puzzle.relativeMouseCoordinates

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  spread() {
    // calculates how to spread pieces
    /* pieces are spreaded in a grid ngx * ngy cells, each of size = kSpread * this.distPoints
                 a rectangular space is reserved for the image, with a margin around it
                */

    let kSpread = 1.7; // center-to-center distance of spreaded pieces,
    let kMargin = 1.7; // empty space around piece
    let gstep = this.distPoints * kSpread; // size of cells where pieces will be spread
    let ngx = mceil((2 * kMargin * this.distPoints + this.srcWidth) / gstep);
    let ngy = mceil((2 * kMargin * this.distPoints + this.srcHeight) / gstep);
    let nTotCells = this.nbPiecesAct + ngx * ngy;

    let nmaxx = mceil(nTotCells / ngy) + 2;
    let nmaxy = mceil(nTotCells / ngx) + 2;
    let bestk = { cellSize: 0 };
    let cellSize;
    for (let nbx = ngx; nbx < nmaxx; ++nbx) {
      let nby = mmax(ngy, mceil(nTotCells / nbx));
      cellSize = mmin(this.contWidth / nbx, this.contHeight / nby);
      if (cellSize > bestk.cellSize) {
        bestk.cellSize = cellSize;
        bestk.nbx = nbx;
        bestk.nby = nby;
      }
    }
    for (let nby = ngy; nby < nmaxy; ++nby) {
      let nbx = mmax(ngx, mceil(nTotCells / nby));
      cellSize = mmin(this.contWidth / nbx, this.contHeight / nby);
      if (cellSize > bestk.cellSize) {
        bestk.cellSize = cellSize;
        bestk.nbx = nbx;
        bestk.nby = nby;
      }
    }

    this.scale = bestk.cellSize / this.distPoints / kSpread;

    let col0 = mfloor((bestk.nbx - ngx) / 2);
    let col1 = col0 + ngx - 1;
    let row0 = mfloor((bestk.nby - ngy) / 2);
    let row1 = row0 + ngy - 1;

    let offsx = (this.contWidth - bestk.nbx * bestk.cellSize) / 2;
    let offsy = (this.contHeight - bestk.nby * bestk.cellSize) / 2;
    let idxpc = 0;
    loopSpr: for (let ky = 0; ky < bestk.nby; ++ky) {
      for (let kx = 0; kx < bestk.nbx; ++kx) {
        if (kx >= col0 && kx <= col1 && ky >= row0 && ky <= row1) continue; // place for image
        let pp = this.polyPieces[idxpc++];
        this.fromSrcMatrix = getTransformMatrix(
          pp.pCentre.x,
          pp.pCentre.y,
          puzzle.scale,
          pp.rot,
          offsx + (kx + 0.5) * bestk.cellSize,
          offsy + (ky + 0.5) * bestk.cellSize
        );
        pp.x = this.fromSrcMatrix.e;
        pp.y = this.fromSrcMatrix.f;
        if (idxpc >= this.nbPiecesAct) break loopSpr;
      } // for ky;
    } // for ky
  } // spread
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  evaluateOrder() {
    /* re-evaluates order of polypieces in puzzle after a merge
                  the polypieces must be in decreasing order of size(number of pieces),
                  preserving the previous order as much as possible
                */
    for (let k = this.polyPieces.length - 1; k > 0; --k) {
      if (
        this.polyPieces[k].pieces.length > this.polyPieces[k - 1].pieces.length
      ) {
        // swap pieces if not in right order
        [this.polyPieces[k], this.polyPieces[k - 1]] = [
          this.polyPieces[k - 1],
          this.polyPieces[k]
        ];
      }
    } // for k
  } // Puzzle.evaluateOrder
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  getStateData() {
    /* gathers all required data so that game can be saved and restored
                 the data included here only comprises the information for the position and the shape of the PolyPieces
                 The source of the picture is included too, as a link ("https://...") or a data URL
                To avoid the clutter of field names in JSON strings, all data saved here will be put in an array, and this array
                 will be included in the final object as a "base" field
                */
    let ppData;
    let saved = { signature: fileSignature };
    if ("origin" in this.srcImage.dataset) {
      saved.origin = this.srcImage.dataset.origin;
    }
    saved.src = this.srcImage.src;
    let base = [
      this.distPoints,
      this.scale,
      this.prng.seed,
      this.rotationStep,
      this.typeOfShape,
      this.srcWidth,
      this.srcHeight
    ]; // our data
    saved.base = base;
    let pps = []; // array of data for polypieces
    base.push(pps);
    this.polyPieces.forEach((pp) => {
      ppData = [mround(pp.x), mround(pp.y)]; // position rounded to integer, shorter string, loss of accuracy is not significant for our purpose
      if (this.rotationStep) ppData.push(pp.rot);
      pp.pieces.forEach((p) => ppData.push(this.pieces.indexOf(p)));
      pps.push(ppData);
    });
    return saved;
  } // getStateData
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  makePolygons() {
    const distPoints = this.distPoints;

    let tr, polygons;
    let t, points;
    tryagain: do {
      t = new RandomPoints(
        { p0: { x: 0, y: 0 }, p1: { x: this.srcWidth, y: this.srcHeight } },
        distPoints,
        30
      );
      points = generatePoints(t); // shallow copy of RdPoints, without all the stuff which was only useful to creating the points
      tr = new Delaunay(points, t.rect);
      tr.analyze();
      tr.triangulation.forEach((tri) => tri.listTris());
      for (let ktri = 0; ktri < tr.triangulation.length; ++ktri) {
        let tri = tr.triangulation[ktri];
        if (tri.tris.flat(0).length != 3) {
          let cnt = 0;
          if (tri.a.isCorner || tri.a.isEdge) ++cnt;
          if (tri.b.isCorner || tri.b.isEdge) ++cnt;
          if (tri.c.isCorner || tri.c.isEdge) ++cnt;
          if (cnt < 2) continue tryagain; // triangulation does not contain the full rectangle : try again
        }
      } // for ktri
      break;
    } while (true);

    tr.triangulation.forEach((tri, k) => {
      // gravity center
      tri.gc = {
        x: (tri.a.x + tri.b.x + tri.c.x) / 3,
        y: (tri.a.y + tri.b.y + tri.c.y) / 3
      };
    });
    // we'll need intermediate points on segments on perimeter too
    // we'll use the projection of gc on the edge
    // top edge
    let lastkp;
    for (
      let kp = 0, side = 0;
      tr.points[kp]?.isEdge || tr.points[kp]?.isCorner;
      ++kp
    ) {
      if (tr.points[kp].isCorner) side = 1 - side; // results in 0 for vertical side, 1 for horizontal
      let tri = tr.points[kp].tris[0];
      let np = tr.points[kp + 1];
      if (!np?.isEdge && !np?.isCorner) np = tr.points[0];
      let edge = tri.edges.find(
        (edge) =>
          (edge.p0 == tr.points[kp] && edge.p1 == np) ||
          (edge.p1 == tr.points[kp] && edge.p0 == np)
      );

      tr.points[kp].p1 = side
        ? { x: tri.gc.x, y: tr.points[kp].y }
        : { x: tr.points[kp].x, y: tri.gc.y };
      lastkp = kp;
    }

    polygons = [];
    tr.points.forEach((p, k) => polygons.push(new Polygon(tr, k, lastkp)));

    tr.triangulation.forEach((tri) => {
      let ctx = puzzle.playCtx;
      const scale = 0.2;
      ctx.beginPath();
      ctx.moveTo(scale * tri.a.x + 20, scale * tri.a.y + 20);
      ctx.lineTo(scale * tri.b.x + 20, scale * tri.b.y + 20);
      ctx.lineTo(scale * tri.c.x + 20, scale * tri.c.y + 20);
      ctx.closePath();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // define the sides of the polygons, and do not re-create side shared with another polygon

    polygons.forEach((poly) => {
      let side, side1;
      const nVert = poly.vertices.length;
      poly.sides = [];
      for (let k = 0; k < nVert; ++k) {
        let p0 = poly.vertices[k];
        let p1 = poly.vertices[(k + 1) % nVert];
        side = new Side("d", [p0, p1]);
        side.polys = [poly]; // side will be oriented in the natural direction for polys[0]

        if ((p0.isCorner || p0.isEdge) && (p1.isCorner || p1.isEdge)) {
          // side is not shared
          side.isEdge = true;
          poly.isEdge = true;
        } else {
          if (p0.sides) {
            // check if this side already exists
            side1 = p0.sides.find(
              (ed) =>
                (ed.points[0] == p0 && ed.points[1] == p1) ||
                (ed.points[0] == p1 && ed.points[1] == p0)
            );
          }
          if (side1 != undefined) {
            // this side already known
            side = side1; // re-use it for this side of the side
            side.polys.push(poly);
          } else {
            p0.sides = p0.sides || [];
            p0.sides.push(side);
            p1.sides = p1.sides || [];
            p1.sides.push(side);
          }
        }
        poly.sides[k] = side;
      } //
    });

    /* build list of neighbors - for future detection of PolyPieces touching each other */

    polygons.forEach((poly) => {
      poly.neighbors = new Set();
      poly.sides.forEach((side) => {
        side.polys.forEach((pp) => poly.neighbors.add(pp));
        poly.neighbors.delete(poly);
      });
    });
    this.pieces = polygons;

    function center(p0, p1) {
      return { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    } // center
  } // makePolygons
} // class Puzzle
//-----------------------------------------------------------------------------

let loadFile;
{
  // scope for loadFile

  let options;

  let elFile = document.createElement("input");
  elFile.setAttribute("type", "file");
  elFile.style.display = "none";
  elFile.addEventListener("change", getFile);

  function getFile() {
    let origin;
    if (this.files.length == 0) {
      //      returnLoadFile ({fail: 'no file'});
      return;
    }
    let reader = new FileReader();

    reader.addEventListener("load", () => {
      puzzle.srcImage.src = reader.result;
      puzzle.srcImage.dataset.origin = origin;
      makeSaveFileName(origin);
    });
    reader.readAsDataURL(this.files[0]);
    origin = this.files[0].name;
  } // getFile

  loadFile = function () {
    elFile.setAttribute("accept", "image/*");
    elFile.value = null; // else, re-selecting the same file does not trigger "change"
    elFile.click();
  }; // loadFile
} //  // scope for loadFile

let loadSaved;
{
  // scope for loadSaved
  // almost a copy of "loadFile", adapted to load saved game instead of picture
  let options;
  let loading = false; // to help detection of cancel on

  let elFile = document.createElement("input");
  elFile.setAttribute("type", "file");
  elFile.style.display = "none";
  elFile.addEventListener("change", getFile);

  document.body.addEventListener("mousemove", () => {
    if (loading) {
      loading = false;
      events.push({ event: "cancel" });
    }
  });

  function getFile() {
    if (this.files.length == 0) {
      events.push({ event: "cancel" });
      return;
    }
    let reader = new FileReader();
    let fname = this.files[0].name;

    reader.addEventListener("load", () => {
      puzzle.restoredString = reader.result;
      loading = false;
      events.push({ event: "restored" });
      if (fname.endsWith(fileExtension)) {
        fname = fname.substring(0, fname.length - fileExtension.length);
      }
      makeSaveFileName(fname);
    });
    reader.readAsText(this.files[0]);
  } // getFile

  loadSaved = function () {
    elFile.setAttribute("accept", `${fileExtension}`);
    elFile.value = null; // else, re-selecting the same file does not trigger "change"
    elFile.click();
    loading = true;
  }; // loadSaved
} //  // scope for loadSaved

function loadInitialFile() {
  let defaultImage = "https://assets.codepen.io/2574552/Mona_Lisa.jpg";
  puzzle.imageLoaded = false;
  loadRemoteFile(defaultImage);
  makeSaveFileName(defaultImage);
  setTimeout(() => events.push({ event: "timeout" }), 5000);
}
function loadRemoteFile(fileURL) {
  puzzle.srcImage.src = fileURL;
  delete puzzle.srcImage.dataset.origin; // makes difference from locally loaded pictures
}
//-----------------------------------------------------------------------------
function imageLoaded() {
  puzzle.imageLoaded = true;
  let event = { event: "srcImageLoaded" };
  if (puzzle.restoring) {
    delete puzzle.restoring;
    /* check image natural size against expected one */
    if (
      mround(puzzle.srcWidth) != puzzle.restoredState.base[5] ||
      mround(puzzle.srcHeight) != puzzle.restoredState.base[6]
    ) {
      popup([
        "Something went wrong.",
        "I could not restore the game. Sorry for the inconvenience."
      ]);
      event.event = "wrongImage";
    } // if wrong size
  } // if restoring
  events.push(event);
} // imageLoaded

//-----------------------------------------------------------------------------
function fitImage(img, width, height) {
  /* The image is a child of puzzle.container. It will be styled to be as big as possible, not wider than width,
            not higher than height, centered in puzzle.container
            (width and height must be less than or equal to the container dimensions)
            */

  let wn = img.naturalWidth;
  let hn = img.naturalHeight;
  let w = width;
  let h = (w * hn) / wn;
  if (h > height) {
    h = height;
    w = (h * wn) / hn;
  }
  img.style.position = "absolute";
  img.style.width = w + "px";
  img.style.height = h + "px";
  img.style.top = "50%";
  img.style.left = "50%";
  img.style.transform = "translate(-50%,-50%)";
}
//-----------------------------------------------------------------------------
let animate;
let events = []; // queue for events

{
  // scope for animate
  let state = 0;
  let moving = {}; // for information about moved piece
  let tmpImage;
  let tInit;
  let filesave;

  animate = function (tStamp) {
    requestAnimationFrame(animate);

    let event;
    if (events.length) event = events.shift(); // read event from queue
    if (event && event.event == "reset") state = 0;
    if (
      event?.event == "timeout" &&
      (state == 10 || state == 15) &&
      !puzzle.imageLoaded
    ) {
      // create empty image to avoid blocking situation
      puzzle.srcImage.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAJUlEQVR4AeyQMQ0AAAyDlmrDv6XNwYKAkvBxEWCNGUnDd5TecwAAAP//4lOPOQAAAAZJREFUAwBRdRIDdhSIewAAAABJRU5ErkJggg==";
      state = 10;
      popup([
        "Something went wrong loading this image.",
        "You can still try to play with local images or saved games."
      ]);
    } // timeout event
    // resize event
    if (event?.event == "resize") {
      // remember dimensions of container before resize
      puzzle.prevWidth = puzzle.contWidth;
      puzzle.prevHeight = puzzle.contHeight;
      puzzle.getContainerSize();
      if (state == 15 || state == 60) {
        // resize initial or final picture
        puzzle.getContainerSize();
        fitImage(tmpImage, puzzle.contWidth * 0.95, puzzle.contHeight * 0.95);
      } else if (state >= 25) {
        // resize pieces
        puzzle.getContainerSize();
        puzzle.moveCanvas.width = puzzle.playCanvas.width = puzzle.contWidth;
        puzzle.moveCanvas.height = puzzle.playCanvas.height = puzzle.contHeight;
        puzzle.drawPolyPieces();
      }
    } // resize event

    switch (state) {
      /* initialisation */
      case 0:
        state = 10;
      /* wait for image loaded and other required parameters*/
      case 10:
        playing = false;
        if (!puzzle.imageLoaded) return;

        // display centered initial image
        puzzle.container.innerHTML = ""; // forget contents
        tmpImage = document.createElement("img");
        tmpImage.addEventListener("load", () => {
          puzzle.getContainerSize();
          fitImage(tmpImage, puzzle.contWidth * 0.95, puzzle.contHeight * 0.95);
        });
        tmpImage.src = puzzle.srcImage.src;
        tmpImage.style.boxShadow = "-4px 4px 4px rgba(0, 0, 0, 0.5)";
        puzzle.container.appendChild(tmpImage);
        state = 15;
        break;

      /* wait for start */
      case 15:
        if (!puzzle.imageLoaded) {
          state = 10;
          return;
        }
        puzzle.srcWidth = puzzle.srcImage.naturalWidth;
        puzzle.srcHeight = puzzle.srcImage.naturalHeight;
        playing = false;
        ui.waiting();
        if (autoStart) event = { event: "nbpieces", nbpieces: 12 }; // auto start
        autoStart = false; // not twice
        if (!event) return;
        if (event.event == "nbpieces") {
          puzzle.nbPieces = event.nbpieces;
          state = 20;
        } else if (event.event == "srcImageLoaded") {
          state = 10;
          return;
        } else if (event.event == "restore") {
          filesave = event.file;
          state = 150;
          return;
        } else return;

      case 20:
        puzzle.drawMode = ui.drawmode.value;
        ui.close();
        ui.playing();
        playing = true;
        /* prepare puzzle */
        if (puzzle.restoredState) {
          puzzle.create(puzzle.restoredState.base); // retrieve polypieces
        } else {
          puzzle.create();
        }
        if (puzzle.restoredState) {
          puzzle.doScale();
          puzzle.polyPieces.forEach((pp) => pp.moveTo(pp.x, pp.y));
          delete puzzle.restoredState;
        } else {
          puzzle.spread(); // initial "optimal" spread position
          puzzle.doScale();
        }
        puzzle.drawPolyPieces();
        state = 50;
        break;
      /* wait for user grabbing a piece or other action */
      case 50:
        if (puzzle.drawMode != ui.drawmode.value) {
          puzzle.drawMode = ui.drawmode.value;
          puzzle.drawPolyPieces();
        }
        if (!event) return;
        if (event.event == "stop") {
          state = 10;
          return;
        }
        if (event.event == "nbpieces") {
          puzzle.nbPieces = event.nbpieces;
          state = 20;
        } else if (event.event == "save") {
          filesave = event.file; // record if storage or file save
          state = 120;
        } else if (
          event.event == "touch" &&
          puzzle.container.querySelector(".showimage")?.style?.display !=
            "block"
        ) {
          moving = {
            xMouseInit: event.position.x,
            yMouseInit: event.position.y,
            tInit: tStamp
          };

          /* evaluates if contact inside a PolyPiece, by decreasing z-index */
          for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
            let pp = puzzle.polyPieces[k];

            if (pp.isPointInPath(event.position)) {
              pp.selected = true;
              //                                    pp.drawImage();
              moving.pp = pp;
              moving.ppXInit = pp.x;
              moving.ppYInit = pp.y;
              // move selected piece to top of PolyPieces stack
              puzzle.polyPieces.splice(k, 1);
              puzzle.polyPieces.push(pp);
              pp.isMoving = true;
              puzzle.drawPolyPieces();
              //                                    pp.canvas.style.zIndex = puzzle.zIndexSup; // to foreground
              state = 55;
              return;
            }
          } // for k
          /* not inside a polypiece, assume this is the beginning of a sweeping or zooming action */
          state = 100;
        } else if (
          event.event == "touches" &&
          puzzle.container.querySelector(".showimage").style.display != "block"
        ) {
          // re-use same object as for moves to record useful information
          moving = { touches: event.touches };
          state = 110; // go zooming with double touch
        } else if (event.event == "wheel") {
          const center = event.center ? event.center : lastMousePos;
          if (event.wheel.deltaY > 0) puzzle.zoomBy(1.3, center);
          if (event.wheel.deltaY < 0) puzzle.zoomBy(1 / 1.3, center);
        }
        break;

      case 55: // moving piece
        if (!event) return;
        if (event.event == "stop") {
          state = 10;
          return;
        }
        switch (event.event) {
          case "moves": // switch to zoom command
          case "touches":
            moving.pp.selected = false;
            moving.pp.drawImage();
            moving = { touches: event.touches };
            state = 110; // go zooming with double touch
            break;

          case "move":
            if (event?.ev?.buttons === 0) {
              events.push({ event: "leave" }); // buttons released while mouse out of canvas.
              break;
            }
            moving.pp.moveTo(
              event.position.x - moving.xMouseInit + moving.ppXInit,
              event.position.y - moving.yMouseInit + moving.ppYInit
            );
            moving.pp.drawImage();
            break;
          case "leave":
            if (puzzle.rotationStep && tStamp < moving.tInit + 250) {
              // Short click/touch: rotate.
              if (event.shiftKey)
                moving.pp.rotate(
                  (moving.pp.rot + puzzle.nbRot - 1) % puzzle.nbRot
                );
              // ctrl: turn ccw
              else moving.pp.rotate((moving.pp.rot + 1) % puzzle.nbRot);
            }
            // Check if moved polypiece is close to a matching other polypiece.
            // Check repeatedly since polypieces moved by merging may come close to other polypieces.
            let doneSomething;
            moving.pp.selected = false;
            moving.pp.isMoving = false;
            puzzle.moveCtx.clearRect(
              0,
              0,
              puzzle.moveCanvas.width,
              puzzle.moveCanvas.height
            );
            let merged = false;
            do {
              doneSomething = false;
              for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
                let pp = puzzle.polyPieces[k];
                if (pp == moving.pp) continue; // don't match with myself.
                if (moving.pp.ifNear(pp)) {
                  // a match !
                  merged = true;
                  // Compare polypieces sizes to move smallest one.
                  if (pp.pieces.length > moving.pp.pieces.length) {
                    pp.merge(moving.pp);
                    moving.pp = pp; // memorize piece to follow
                  } else {
                    moving.pp.merge(pp);
                  }
                  doneSomething = true;
                  break;
                }
              } // for k
            } while (doneSomething);
            // not at its right place
            puzzle.evaluateOrder();
            if (merged) {
              moving.pp.isMoving = true;
              moving.pp.selected = true;
              moving.pp.drawImage(true);
              moving.tInit = tStamp + 500; // final t in fact
              state = 56;
              break;
            }
            puzzle.drawPolyPieces();
            state = 50; // just go back waiting
            if (puzzle.polyPieces.length == 1 && puzzle.polyPieces[0].rot == 0)
              state = 60; // won!
        } // switch (event.event)

        break;
      case 56:
        if (tStamp < moving.tInit) return; // merged piece enlighted
        moving.pp.isMoving = false;
        moving.pp.selected = false;
        puzzle.moveCtx.clearRect(
          0,
          0,
          puzzle.moveCanvas.width,
          puzzle.moveCanvas.height
        );
        puzzle.drawPolyPieces();
        if (puzzle.polyPieces.length == 1 && puzzle.polyPieces[0].rot == 0)
          state = 60;
        // won!
        else state = 50;
        break;

      case 60: // winning
        playing = false;
        puzzle.container.innerHTML = "";
        puzzle.getContainerSize();

        fitImage(tmpImage, puzzle.contWidth * 0.95, puzzle.contHeight * 0.95);
        let finalWidth = tmpImage.style.width;
        let finalHeight = tmpImage.style.height;
        // Set tmpImage to cover the exactly the only polypiece left, size and and position.

        tmpImage.style.width = `${puzzle.srcWidth * puzzle.scale}px`;
        tmpImage.style.height = `${puzzle.srcHeight * puzzle.scale}px`;
        tmpImage.style.left = `${
          ((puzzle.polyPieces[0].x + (puzzle.srcWidth * puzzle.scale) / 2) /
            puzzle.contWidth) *
          100
        }%`;
        tmpImage.style.top = `${
          ((puzzle.polyPieces[0].y + (puzzle.srcHeight * puzzle.scale) / 2) /
            puzzle.contHeight) *
          100
        }%`;
        tmpImage.style.boxShadow = "-4px 4px 4px rgba(0, 0, 0, 0.5)";
        // tmpImage.style.top=(puzzle.polyPieces[0].y + puzzle.scaley / 2) / puzzle.contHeight * 100 + 50 + "%" ;
        // tmpImage.style.left=(puzzle.polyPieces[0].x + puzzle.scalex / 2) / puzzle.contWidth * 100 + 50 + "%" ;

        tmpImage.classList.add("moving");
        setTimeout(() => {
          tmpImage.style.top = tmpImage.style.left = "50%";
          tmpImage.style.width = finalWidth;
          tmpImage.style.height = finalHeight;
        }, 0);
        puzzle.container.appendChild(tmpImage);
        state = 15;
        break;

      case 100:
        if (!event) return;
        if (event.event == "move") {
          // sweeping
          if (event?.ev?.buttons === 0) {
            // button released while mouse out of window
            state = 50;
            break;
          }
          puzzle.sweepBy(
            event.position.x - moving.xMouseInit,
            event.position.y - moving.yMouseInit
          );
          moving.xMouseInit = event.position.x;
          moving.yMouseInit = event.position.y;
          return;
        }
        if (event.event == "leave") {
          state = 50; /* go back waiting */
          return;
        }
        if (event.event == "touches") {
          // re-use same object as for moves to record useful information
          moving = { touches: event.touches };
          state = 110; // go zooming with double touch
        }
        break;

      case 110:
        if (!event) return;
        if (event.event == "leave") {
          state = 50; /* go back waiting */
          return;
        }
        if (event.event == "moves") {
          let center = {
            x: (moving.touches[0].x + moving.touches[1].x) / 2,
            y: (moving.touches[0].y + moving.touches[1].y) / 2
          };
          let dInit = mhypot(
            moving.touches[0].x - moving.touches[1].x,
            moving.touches[0].y - moving.touches[1].y
          );
          let d = mhypot(
            event.touches[0].x - event.touches[1].x,
            event.touches[0].y - event.touches[1].y
          );
          // (arbitrary) reference :  the zoom factor will be 2,71828 for a change in touches == dRef.
          let dRef = msqrt(puzzle.contWidth * puzzle.contHeight) / 5;
          puzzle.zoomBy(Math.exp((d - dInit) / dRef), center);
          moving.touches = event.touches;
          return;
        }
        break;

      case 120: // save state
        let savedData = puzzle.getStateData();
        let savedString = JSON.stringify(savedData);
        if (filesave) {
          /* Retrieve file name from user interface. */
          let name = makeSaveFileName(ui.saveas.value);
          saveFile(savedString, `${name}${fileExtension}`);
          ui.fsave.classList.add("enhanced");
          setTimeout(() => ui.fsave.classList.remove("enhanced"), 500);
        } else {
          try {
            localStorage.setItem("savepuzzle", savedString);
            ui.save.classList.add("enhanced");
            setTimeout(() => ui.save.classList.remove("enhanced"), 500);
          } catch (exception) {
            popup([
              "Something went wrong trying to save the game.",
              "Consider saving the game in a file.",
              `JS says: ${exception.message}`
            ]);
          }
        }
        state = 50;
        break;

      case 150: // restore game
        puzzle.restoredString = "";
        if (filesave) {
          // restore event - loadSaved(); already done in the event.
          state = 152;
        } else {
          try {
            puzzle.restoredString = localStorage.getItem("savepuzzle");
            if (puzzle.restoredString === null) puzzle.restoredString = "";
          } catch (exception) {
            puzzle.restoredString = "";
          }
          if (puzzle.restoredString.length == 0) {
            state = 15; // silently ignore if something wrong
            break;
          }

          state = 155;
        }
        break;

      case 152:
        if (!event) return;
        if (event.event == "cancel") {
          state = 15;
          return;
        } else if (event.event !== "restored") return; //ignore other events

        state = 155;

      case 155:
        try {
          puzzle.restoredState = JSON.parse(puzzle.restoredString);
        } catch (error) {
          popup(["Invalid JSON data."]);
          delete puzzle.restoredState;
          state = 10;
          break;
        }
        if (
          !puzzle.restoredState.signature ||
          puzzle.restoredState.signature != fileSignature ||
          !puzzle.restoredState.src
        ) {
          popup(["Not a valid game file."]);
          delete puzzle.restoredState;
          state = 10;
          break;
        }
        /* Could check here if data contains expected fields. */

        puzzle.restoring = true;
        puzzle.imageLoaded = false;
        puzzle.srcImage.src = puzzle.restoredState.src;
        if (puzzle.restoredState.origin)
          puzzle.srcImage.dataset.origin = puzzle.restoredState.origin;
        else delete puzzle.srcImage.dataset.origin;
        if (!filesave)
          makeSaveFileName(
            puzzle.restoredState.origin || puzzle.restoredState.src
          );
        tInit = tStamp; // to check that file really reads
        state = 158;

      case 158:
        if (event && event.event == "srcImageLoaded") {
          state = 160;
        } else if (event && event.event == "wrongImage") {
          state = 10;
          break;
        } else if (tStamp > tInit + 5000) {
          events.push({ event: "timeout" });
          state = 10; // give up after 5s
        }
        break;
      case 160:
        tmpImage.src = puzzle.srcImage.src;
        fitImage(tmpImage, puzzle.contWidth * 0.95, puzzle.contHeight * 0.95);
        state = 20; // step 20 will use puzzle.restoredState.base to re-create saved game
        break;

      case 9999:
        break;
    } // switch(state)
  }; // animate
} // scope for animate
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

prepareUI();

window.addEventListener("resize", (event) => {
  // Do not accumulate resize events in events queue - keep only current one.
  if (events.length && events[events.length - 1].event == "resize") return;
  events.push({ event: "resize" });
});

puzzle = new Puzzle({ container: "forPuzzle" });
autoStart = isMiniature(); // used for nice miniature in CodePen

loadInitialFile();
requestAnimationFrame(animate);
