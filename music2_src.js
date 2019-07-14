'use strict';

function getNote($note) {
    if($note)
        return $note.data('logicalNote');
    else
        return null;
}

function note_clicked() {
    if(isPlaying)
        return;
    
    if($(this).find(".vf-stavenote")[0] === undefined)
        return;
    
    if($(this).is($selectedNote))
        setSelectedNote(null);
    else
        setSelectedNote($(this));
}

var notes_group = undefined;

var context, stave;

var notes = [];

const staveXPadding = 10;

var numBeats = 4;

var beatValue = 4;

var svg_width = 400;

var svg_height = (svg_width * (12/40));

var currentPlayIndex;

var noteTimeout;

var staveWidth;

var isPlaying = false;

var renderer;

var restMode = false;

var nextDuration = '4';

var currentGeneralMode = 0;

function endPlay() {
    setSelectedNote(null);
    isPlaying = false;
    console.log("Remove prop");
    $("#note-play").prop("disabled", false);
    $("#note-stop").prop("disabled", "disabled");
}
    
function playSequence() {
   
    
    function keepPlaying() {
        /* Check if we are still playing */
        if(!isPlaying) {
            endPlay();
            return;
        }
        
        currentPlayIndex++;
        if(currentPlayIndex == notes.length) {
            endPlay();
            return;
        }
        
        setSelectedNote($(notes[currentPlayIndex].my_svg_group), keepPlaying);
    };
    /* Check if we are already playing */
    if(isPlaying)
        return;
    
    $("#note-play").prop("disabled", "disabled");
    $("#note-stop").prop("disabled", false);
    console.log("Selected note: " + $selectedNote);
    currentPlayIndex = -2; //notes.indexOf(getNote($selectedNote)) - 1;
    
    console.log("Start index: " + currentPlayIndex);
    
    if(currentPlayIndex === -2)
        currentPlayIndex = -1;
    
    isPlaying = true;
    
    /* Begin playing */
    keepPlaying();
}

function replaceNote(oldNote, newNote) {
    var replaceSelected = false;
    if($selectedNote && getNote($selectedNote) == oldNote)
        replaceSelected = true;
    
    var index = notes.indexOf(oldNote);
    if(index == -1)
        throw "Old note not attached";
    
    notes[index] = newNote;
    
    renderNotes();
     
    if(replaceSelected) {
        setSelectedNote($(newNote.my_svg_group));
    }
}

function addNote(num) {
    console.log("restMode is " + restMode);
    if(num !== undefined && (!restMode))
        notes.push(decodeNote(num, nextDuration));
    else
        notes.push(generateNote('C', '4', nextDuration));
    renderNotes();
    setSelectedNote($(notes[notes.length-1].my_svg_group));
}

function playNote(num, duration, cb, isRest = false, stopNote = true) {
    var note = num + 12;
    var velocity = 127; // how hard the note hits
    
    duration = parseInt(duration);
    
    // play the note
    MIDI.setVolume(0, 127);
    var offTime = 0.75 / (duration / 4);
    console.log("MIDI note " + note);
    if(!isRest) {
        MIDI.noteOn(0, note, velocity, 0);
        if(stopNote)
            MIDI.noteOff(0, note, offTime);
    }
    if(stopNote && cb)
        noteTimeout = setTimeout(cb, offTime * 1000);
}
var VF = require('vexflow').Flow;

var opensheetmusicdisplay = require('opensheetmusicdisplay');

MIDI.loadPlugin({
    soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
    instrument: "acoustic_grand_piano", // or the instrument code 1 (aka the default)
    onsuccess: startProgram
});

function removeNote() {
    if($selectedNote) {
        var actualNote = getNote($selectedNote);
        var index = notes.indexOf(actualNote);
        if (index > -1) {
            var nextSelected;
            if(index < (notes.length - 1)) { /* There is a note to the right */
                nextSelected = notes[index+1];
            } else if(index === (notes.length - 1)) { /* There is a note to the left */
                nextSelected = notes[index-1];
            } else
                nextSelected = null;
            notes.splice(index, 1);
            renderNotes();
            if(nextSelected)
                setSelectedNote($(nextSelected.my_svg_group), false);
            else
                setSelectedNote(null);
        }
    }
}

function encodeNote(note) {
    if(note === undefined || note === null)
        return undefined;
    
    var key = VF.keyProperties.note_values[note.our_keyname].int_val;
    console.log("Index " + key);
    var num = ((note.our_octave * 12) + key);
    return num;
}

function decodeNote(num, duration) {
    var key = num % 12;
    var oct = (num-key) / 12;
    return generateNote(VF.integerToNote.table[key], oct, duration);
}

function addToNote(amount) {
    if(!$selectedNote)
        return;
    var note = getNote($selectedNote);
    if(note.is_a_rest)
        return;
    var num = encodeNote(note);
    num += amount;
    console.log("Index " + num);
    replaceNote(note, decodeNote(num, note.getDuration()));
}

var intervalId;
var intervalTimeout;

var autoRepeatDelay = 100;
var autoRepeatWait = 750;
$("#note-pitch-up").tapstart(function() {
    addToNote(1);
    intervalTimeout = setTimeout(() => {
        intervalId = setInterval(() => { addToNote(1); }, autoRepeatDelay);
    }, autoRepeatWait);
}).tapend(function() {
    clearInterval(intervalId);
    clearTimeout(intervalTimeout);
});
$("#note-pitch-down").tapstart(function() {
    addToNote(-1);
    intervalTimeout = setTimeout(() => {
        intervalId = setInterval(() => { addToNote(-1); }, autoRepeatDelay);
    }, autoRepeatWait);
}).tapend(function() {
    clearInterval(intervalId);
    clearTimeout(intervalTimeout);
});

$("#note-pitch-down").add("#note-pitch-up").mouseleave(function() {
    $(this).tapend();
});

$("#note-add").tap(() => { addNote(encodeNote(getNote($selectedNote))); });
$("#note-play").tap(() => { playSequence(); });
$("#note-stop").tap(() => { isPlaying = false; clearTimeout(noteTimeout); MIDI.stopAllNotes();  endPlay(); });
$("#note-remove").tap(() => { removeNote(); });
$("#note-types > label").tap((event) => {
    var $input = $(event.target).find('input');
    if($input.attr('id') == 'note-type-note')
        restMode = false;
    else
        restMode = true;
    if($selectedNote) {
        
    }
});

$("#note-durations > label").tap((event) => {
    var $input = $(event.target).find('input');
    nextDuration = $input.attr("data-duration");
    console.log("Next duration: " + nextDuration);
    if($selectedNote) {
        var note = getNote($selectedNote);
		if(!restMode)
	        replaceNote(note, decodeNote(encodeNote(note), nextDuration));
		else
			replaceNote(note, generateNote('c', '4', nextDuration));
    }
});


function generateNote(keyname, octave, duration) {
    
    if(keyname === undefined)
        throw "Undefined keyname";
    
    keyname = keyname.toUpperCase();
    
    if(duration === undefined || duration === null)
        throw "Undefined duration";
    
    var note_info = VF.keyProperties.note_values[keyname];
    
    
    var key;
    
    if(!restMode)
        key =  keyname + '/' + octave;
    else
        key = 'r/4';
    var theNote = new VF.StaveNote({clef: "treble", keys: [ key ], duration: duration + (restMode ? 'r' : '') });
    if(note_info !== undefined && note_info !== null && note_info.accidental !== null) {
        theNote = theNote.addAccidental(0, new VF.Accidental(note_info.accidental));
    }
    theNote.is_a_rest = restMode;
    theNote.our_keyname = keyname;
    theNote.our_octave = octave;
    return theNote;
}

var $selectedNote = null;

function setSelectedNote($note, play_cb, doPlay = true) {
    /* If there is a previously selected note, deselect it */
    if($selectedNote)
        $selectedNote.removeClass("selected-note");
    
    
    $selectedNote = $note;
    
    if(!$note)
        return;
    
    $selectedNote.addClass("selected-note");
    var note = getNote($selectedNote);
    
    var $semitone_buttons = $("#note-pitch-up").add("#note-pitch-down");
    if(note.is_a_rest) {
        console.log("DISABLED!");
        $semitone_buttons.prop("disabled", true);
    } else
        $semitone_buttons.prop("disabled", false);
    
    if(doPlay)
        playNote(encodeNote(note), note.getDuration(), play_cb, note.is_a_rest);
}


function processMeasures() {
    
    var newNotes = notes.slice();
    // sum ticks and add new measures when neccessary
    var sumTicks = 0;
    var totalTicksPerMeasure = 1024 * numBeats * beatValue;

    for ( var i = 0; i < newNotes.length; i++) {

        if (newNotes[i].duration == "b") {
            sumTicks = 0;
            continue;
        }

        if (sumTicks == totalTicksPerMeasure) {
            newNotes.splice(i,0,new VF.BarNote());
            sumTicks = 0;
            continue;
        }

        sumTicks += eval(newNotes[i].ticks.toString());
        console.log("ticks: " + sumTicks);
    }
    return newNotes;
}

function renderNotes() {
    notes.forEach(function(note) {
        /* Clear the data store for the group */
        $(note.my_svg_group).data('logicalNote', null);
    });
    
    $(notes_group).remove();
    
    notes_group = context.openGroup();
    
    var tmpNotes = processMeasures();

    var beams = VF.Beam.generateBeams(tmpNotes);

    // Create a stave at position 10, 40 of width 400 on the canvas.
    
    staveWidth = Math.max(100, (notes.length+1) * 85);
    stave = new VF.Stave(staveXPadding, 0, staveWidth);
    
    // Size our svg:
    renderer.resize(staveWidth + (staveXPadding*2), svg_height);

    $("svg").attr({ "preserveAspectRatio" : "xMinYMid meet", "viewBox": "0 0 " + (staveWidth + (staveXPadding*2)) + " " + svg_height });

    // Add a clef and time signature.
    stave.addClef("treble");

    // Connect it to the rendering context and draw!
    stave.setContext(context).draw();
    
    // Create a voice in 4/4 and add above notes
    var voice = new VF.Voice({num_beats: numBeats,  beat_value: beatValue});
    voice.setStrict(false);
    voice.addTickables(tmpNotes);

    // Format and justify the notes to 400 pixels.
    var formatter = new VF.Formatter().joinVoices([voice]).format([voice], staveWidth - 20);

    tmpNotes.forEach(function(note) {
        note.my_svg_group = context.openGroup();
        note.setStave(stave).setContext(context).draw();
        context.closeGroup();
        $(note.my_svg_group).data('logicalNote', note);
        $(note.my_svg_group).tap(note_clicked);
        $(note.my_svg_group).tapend(() => { console.log("mouseup"); });
        $(note.my_svg_group).addClass("svg-pointer-event-helper");
        
        var bbox = note.my_svg_group.getBBox();
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute("width", bbox.width);
        rect.setAttribute("height", bbox.height);
        rect.setAttribute("x", bbox.x);
        rect.setAttribute("y", bbox.y);
        
        $(rect).css({ 'fill': 'transparent' });
        $(note.my_svg_group).append(rect);
    });

    beams.forEach(function(beam) {
      beam.setContext(context).draw();
    });

    context.closeGroup();
}

/* There was once a way to play the black keys... */
/* const piano_strings = "zsxdcvgbhnjmk,l.;/'"; */

const piano_strings = "c;d-ef/g{a}bc";


var pressedKeys = [];

var noteCurrentlyPressed = false;

function piano_key_down(e, c, down = true) {
    var isMouse = e.type.startsWith("tap") || e.type.startsWith("mouse");
    c = c.toLowerCase();
    
    
    if(pressedKeys[c] == down) {
        console.log("key " + c + " remains in state: " + down);
        return;
    }
    
    if(piano_strings.indexOf(c) === -1)
    {
        return; /* This isn't a valid key */
    }
    
    
    var black_key;
    var index;
    if(isMouse)
        index = parseInt($(e.target).attr("data-index"));
    else
        index = piano_strings.indexOf(c);
    
    
    
    if(index == -1) {
        console.log("cannot find " + c);
        return;
    }
    
    black_key = $(this).css('background-color') == 'black';
    
    if(black_key) {
        return;
    }
    
    if(down)
        playNote(48 + index, 0, undefined, false, false);
    else {
        MIDI.noteOff(0, 60 + index, 0);
    }
    
    console.log("Set pressedKeys['" + c + "'] from " + pressedKeys[c] + " to " + down);
    pressedKeys[c] = down;
    noteCurrentlyPressed = down;
    var $piano_key;
    if(isMouse)
        $piano_key = $(e.target);
    else
        $piano_key = $($('#piano-controls span:contains("' + c.toUpperCase() + '")')[0]).parent();
    if(down)
        $piano_key.addClass("key-pressed");
    else
        $piano_key.removeClass("key-pressed");
}

function piano_key_mousedown(e) {
    console.log("mousedown");
    var c = $(this).find("span").text();
    piano_key_down(e, c, true);
}
function piano_key_mouseup(e) {
    console.log("mouseup");
    var c = $(this).find("span").text();
    piano_key_down(e, c, false);
}


function setNoteColor(index, color) {
    var voice_e =  getVoiceEntry(index);
    var source = voice_e.notes[0].sourceNote;
    source.noteheadColor = color;
    var ve = voice_e.parentVoiceEntry;
    
    ve.stemColor = color;
}

function getNumNotes() {
    var num = 0;
    for(var j = 0; j < osmd.graphic.measureList.length; j++) {
        num += osmd.graphic.measureList[j][0].staffEntries.length;
    }
    
    return num;
}

function getVoiceEntry(index) {
    var oldIndex = index;
    /* Knock down the index until it's too small */
    var i = 0;
    for(; i < osmd.graphic.measureList.length; i++) {
        index -= osmd.graphic.measureList[i][0].staffEntries.length;
        if(index < 0) {
            index += osmd.graphic.measureList[i][0].staffEntries.length;
            break;
        }
    }
    console.log(oldIndex + " found in measureList " + i);
    return osmd.graphic.measureList[i][0].staffEntries[index].graphicalVoiceEntries[0];
}
function getNotePitch(index) {
    var ve = getVoiceEntry(index);
    var pitch = ve.notes[0].sourceNote.pitch;
    return pitch.fundamentalNote;
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}


function startComposer() {
    $("#all-composer-controls").show();
    var score = new VF.EasyScore();
    // Create an SVG renderer and attach it to the DIV element named "boo".
    renderer = new VF.Renderer($(".music-staff-container")[0], VF.Renderer.Backends.SVG);


    // Size our svg:
    renderer.resize(svg_width, svg_height);

    $("svg").attr({ "preserveAspectRatio" : "none", "viewBox": "0 0 " + svg_width + " " + svg_height });

    // And get a drawing context:
    context = renderer.getContext();

    for(var i = 0; i < 4; i++) {
        notes[i] = generateNote('c#', '4', (Math.pow(2, i)).toString());
    }

    renderNotes();
    currentGeneralMode = 1;
}

const songids = [
    "twinkle.musicxml",
    "londonbridge.xml",
    "canoesong.xml"
];

var cmc = [];
function loadSong(id) {
    var container = document.getElementById("sheetmusic-container");
    $(container).empty();
    console.log("Load song " + id);
    window.osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
        drawPartNames: false,
        drawingParameters: 'compact',
        coloringMode: 2,
        coloringSetCustom: cmc,
        colorStemsLikeNoteheads: true,
        autoResize: false
    });
    
    var osmd = window.osmd;
    osmd.load(songids[id]).then(() => {
        osmd.EngravingRules.systemDistance = 0;
        osmd.render();
    });
}

function startPerformer() {
    $("#which-song label").tap(function(e) {
        console.log("Loading");
        loadSong(parseInt($(e.target).find("input").attr("data-songid")));
    });
    $("#all-performer-controls").show();
    
    
    for(var i = 0; i < 7; i++) {
        var rgb = hslToRgb((i/7), 1, 0.5);
        cmc.push(rgbToHex(rgb[0], rgb[1], rgb[2]));
    }
    cmc.push("#000000"); /* rests */
    console.log(cmc);
     
    
    
    var j = 0;
    var k = 0;
    for(var i = 0; i < 14; i++) {
        var $button = $("<button></button>");
        $("#piano-controls").append($button);
        
        if($button.css('display') == 'none') {
            $button.append("<span></span>");
        } else {
            $button.attr("data-index", j);
            $button.append("<span>" + piano_strings[j++].toUpperCase() + "<span>");
        }
        if($button.css('background-color') !== 'rgb(0, 0, 0)') {
            $button.css('background-color', cmc[k]);
            (k = (k+1) % 7);
        }
    }
    currentGeneralMode = 2;
    loadSong(0);
    
    $(document).keydown(function(e) {
        piano_key_down(e, String.fromCharCode(e.which), true);
    });
    $(document).keyup(function(e) {
        piano_key_down(e, String.fromCharCode(e.which), false);
    });
    $("#piano-controls button").tapstart(piano_key_mousedown);
    $("#piano-controls button").tapend(piano_key_mouseup);
    $("#piano-controls button").mouseleave(piano_key_mouseup);
}
window.onhashchange = function() {
    window.location.reload(true);
};

function startProgram() {
    $(".backButton").tap(function() {
        console.log("Clear hash");
        window.location.hash = '';
    });
    if(window.location.hash) {
        console.log(window.location.hash);
        /* Start composer or performer, possibly */
        if(window.location.hash == "#compose") {
            startComposer();
            return;
        } else if(window.location.hash == "#perform") {
            startPerformer();
            return;
        }
    }
    currentGeneralMode = 0;
    $("#info").show();
    
}

$(window).resize(function() {
    if(currentGeneralMode == 2 && window.osmd)
        window.osmd.render();
});
