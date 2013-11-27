/*
 * Comparse
 * parses content and outputs a list of change objects identifying differences
 * http://
 * Work based of "Javascript Diff Algorithm by John Resig (http://ejohn.org/)"
 * More Info:
 *  http://ejohn.org/projects/javascript-diff-algorithm/
 */
// Sample change object
/* {
        before: {
            startline:  [1-n],
            startpos:   [0-n],
            endline:    [1-n],
            endpos:     [0-n]
            content:    ''
        },
        after: {
            startline:  [1-n],
            startpos:   [0-n]
            endline:    [1-n],
            endpos:     [0-n],
            content:    ''
        }
        change: 'removed'|'added'|'replaced'
    }
*/
(function(root, mdl){
    // CommonJS
    if(typeof exports === "object" && typeof module === "object"){
        return mdl(exports); 
    }
    // AMD
    if(typeof define === "function" && define.amd){
        return define(["exports"], mdl);
    }
    // Require
    // Browser
    mdl(root.comparse || (root.comparse = {}));
})(this, function(exports){
    var actions = {
        add: "added",
        remove: "removed",
        replace: "replaced"
    };
    
    function escape(s) {
        var n = s;
        n = n.replace(/&/g, "&amp;");
        n = n.replace(/</g, "&lt;");
        n = n.replace(/>/g, "&gt;");
        n = n.replace(/"/g, "&quot;");
    
        return n;
    }
    
    function diffString( o, n ) {
        o = o.replace(/\s+$/, '');
        n = n.replace(/\s+$/, '');
        var chnges =[];
        var nlines = n.split('\n');
        var olines = o.split('\n');
        var ops = 0;
        var nps = 0;
        var ln;
        var noffset = 0;
        var ooffset = 0;
        var cline;
        var cnt = 0;
        var LINEOFFSET = 1;
        var lineNo;
        console.log(nlines);
        console.log(olines);
        
        var lines = [];
        var lgth = nlines.length > olines.length ? nlines.length : olines.length;
        
        for(var i = 0; i < lgth; i++){
            if(typeof nlines[i] !== 'undefined' && typeof olines[i] !== 'undefined'){
                lines[i] = diff(olines[i] === '' ? [] : olines[i].split(/\s+/), nlines[i] === '' ? [] : nlines[i].split(/\s+/) );
            }else{
                if(typeof nlines[i] === 'undefined'){
                    lines[i] = { o: olines[i].split(/\s+/), n: [] }
                }
                if(typeof olines[i] === 'undefined'){
                    lines[i] = { o: [], n: nlines[i].split(/\s+/) }
                }
            }
        }
        
        var oSpaces = [];
        var nSpaces = [];
        
        for(var i = 0; i < nlines.length; i++){
            nSpaces[i] = nlines[i].match(/\s+/g)
        }
        for(var j = 0; j < olines.length; j++){
            oSpaces[j] = olines[j].match(/\s+/g)
        }
        
        //console.log(lines);
        console.log("spaces")
        console.log(nSpaces);
        console.log(oSpaces);
//---------------------------------------------------------------------------------------------------------------------
        for(var k = 0; k < lgth; k++){
            cline = lines[k];
            lineNo = k + LINEOFFSET;
            if(cline.n.length === 0){
                for (var l = 0; l < cline.o.length; l++) {
                    chnges[chnges.length] = { 
                      before: { 
                        startpos: ops == 0 ? ops : ops += (oSpaces[k] !== null && oSpaces[k][l-1] ? oSpaces[k][l-1].length : 0),
                        endpos: (ops = ops + cline.o[l].length) - 1 ,
                        content: escape(cline.o[l])
                      }, 
                      after: { 
                        startpos: -1,
                        endpos: -1,
                        content: '' 
                      },
                      line : lineNo,
                      change: actions.remove
                  }
                } 
            } else {
                ln = cline.n.length > cline.o.length ? cline.n.length : cline.o.length;
                for(var m = 0; m < ln; m++){
                   if(typeof cline.n[m + noffset] !== 'undefined' && typeof cline.o[m + ooffset] !== 'undefined'){
                       if(typeof cline.n[m + noffset] !== 'object' && typeof cline.o[m + ooffset] !== 'object'){
                           // content was replaced
                           chnges[cnt] = {
                                before: { 
                                    startpos: ops,
                                    endpos: (ops = ops + cline.o[m + ooffset].length) - 1,
                                    content: escape(cline.o[m + ooffset])
                                },
                                after:  { 
                                    startpos: nps,
                                    endpos: (nps = nps + cline.n[m + noffset].length) - 1,
                                    content: escape(cline.n[m + noffset])
                                },
                                line: lineNo,
                                change: actions.replace
                           } 
                           cnt++;
                        } else if(typeof cline.n[m + noffset] !== 'object' && typeof cline.o[m + ooffset] === 'object'){
                            // content was added
                            chnges[cnt] = {
                                before: {
                                    startpos: -1,
                                    endpos: -1,
                                    content: '' 
                                },
                                after:  {
                                    startpos: nps,
                                    endpos: (nps = nps + cline.n[m + noffset].length) - 1,
                                    content: escape(cline.n[m + noffset])
                                },
                                line: lineNo,
                                change: actions.add
                           }
                           noffset++;
                           cnt++;
                        } else if(typeof cline.n[m + noffset] === 'object' && typeof cline.o[m + ooffset] !== 'object'){
                            // content was removed
                            chnges[cnt] = {
                                before: { 
                                    startpos: ops,
                                    endpos: (ops = ops + cline.o[m + ooffset].length) - 1,
                                    content: escape(cline.o[m + ooffset])
                                },
                                after:  { 
                                    startpos: -1,
                                    endpos: -1,
                                    content: '' 
                                },
                                line: lineNo,
                                change: actions.remove
                           }
                           ooffset++;
                           cnt++;
                      } else {
                          // content never changed
                          ops = ops + cline.o[m + ooffset].text.length //+ oSpaces[k][m].length;
                          nps = nps + cline.n[m + noffset].text.length //+ nSpaces[k][m].length;
                      }
                   }else { //if one of the arrays run out
                       if(typeof cline.n[m + noffset] === 'undefined'){ //no more new items
                            for(var j = m + ooffset; j < cline.o.length; j++){
                                if(typeof cline.o[j] !== 'object'){
                                    chnges[cnt] = {
                                        before: { 
                                            startpos: ops,
                                            endpos: (ops = ops + cline.o[j].length) - 1,
                                            content: escape(cline.o[j]) 
                                        },
                                        after:  { 
                                            startpos: -1,
                                            endpos: -1,
                                            content: '' 
                                        },
                                        line: lineNo,
                                        change: actions.remove
                                    }
                                    cnt++;
                                }
                            }
                            break;
                        }
                       if(typeof cline.o[m + ooffset] === 'undefined'){ //no more old items
                            for(var j = m + noffset; j < cline.n.length; j++){
                                if(typeof cline.n[j] !== 'object'){
                                    chnges[cnt] = {
                                        before: { 
                                            startpos: -1,
                                            endpos: -1,
                                            content: '' 
                                        },
                                        after:  { 
                                            startpos: nps,
                                            endpos: (nps = nps + cline.n[j].length) - 1,
                                            content: escape(cline.n[j])
                                        },
                                        line: lineNo,
                                        change: actions.add
                                    }
                                    cnt++;
                                }
                            }
                            break;
                        }
                   }
                }
            }
            ops = 0;
            nps = 0;
        }
        console.log("---------- Changes -------------------");
        console.log(chnges);
        console.log("---------- end -------------------");

    };
    
    function diff( o, n ) {
      var ns = [];
      var os = [];
      for ( var i = 0; i < n.length; i++ ) {
        if ( ns[ n[i] ] == null )
          ns[ n[i] ] = { rows: new Array(), o: null };
        ns[ n[i] ].rows.push( i );
      }
      
      for ( var i = 0; i < o.length; i++ ) {
        if ( os[ o[i] ] == null )
          os[ o[i] ] = { rows: new Array(), n: null };
        os[ o[i] ].rows.push( i );
      }
      
      for ( var i in ns ) {
        if ( ns[i].rows.length == 1 && typeof(os[i]) != "undefined" && os[i].rows.length == 1 ) {
          n[ ns[i].rows[0] ] = { text: n[ ns[i].rows[0] ], oldPos: os[i].rows[0] };
          o[ os[i].rows[0] ] = { text: o[ os[i].rows[0] ], newPos: ns[i].rows[0] };
        }
      }
      
      for ( var i = 0; i < n.length - 1; i++ ) {
        if ( n[i].text != null && n[i+1].text == null && n[i].oldPos + 1 < o.length && o[ n[i].oldPos + 1 ].text == null && 
             n[i+1] == o[ n[i].oldPos + 1 ] ) {
          n[i+1] = { text: n[i+1], oldPos: n[i].oldPos + 1 };
          o[n[i].oldPos+1] = { text: o[n[i].oldPos+1], newPos: i + 1 };
        }
      }
      
      for ( var i = n.length - 1; i > 0; i-- ) {
        if ( n[i].text != null && n[i-1].text == null && n[i].oldPos > 0 && o[ n[i].oldPos - 1 ].text == null && 
             n[i-1] == o[ n[i].oldPos - 1 ] ) {
          n[i-1] = { text: n[i-1], oldPos: n[i].oldPos - 1 };
          o[n[i].oldPos-1] = { text: o[n[i].oldPos-1], newPos: i - 1 };
        }
      }
      
      return { o: o, n: n };
    } 
    exports.parse = function(old, nw, opts){
        return diffString(old, nw);
    }
})