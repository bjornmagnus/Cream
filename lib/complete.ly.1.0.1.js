/**
 * complete.ly 1.0.0
 * MIT Licensing
 * Copyright (c) 2013 Lorenzo Puccetti
 *
 * This Software shall be used for doing good things, not bad things.
 *
 **/

var txtInput;
var txtIrest;

function doGetCaretPosition(oField) {

    // Initialize
    var iCaretPos = 0;

    // IE Support
    if (document.selection) {

        // Set focus on the element
        oField.focus();

        // To get cursor position, get empty selection range
        var oSel = document.selection.createRange();

        // Move selection start to 0 position
        oSel.moveStart('character', -oField.value.length);

        // The caret position is selection length
        iCaretPos = oSel.text.length;
    }

    // Firefox support
    else if (oField.selectionStart || oField.selectionStart == '0')
        iCaretPos = oField.selectionStart;

    // Return results
    return (iCaretPos);
}

function setCursor(node, pos) {

    var node = (typeof node == "string" || node instanceof String) ? document.getElementById(node) : node;

    if (!node) {
        return false;
    } else if (node.createTextRange) {
        var textRange = node.createTextRange();
        textRange.collapse(true);
        textRange.moveEnd(pos);
        textRange.moveStart(pos);
        textRange.select();
        return true;
    } else if (node.setSelectionRange) {
        node.setSelectionRange(pos, pos);
        return true;
    }

    return false;
}

function completely(container, config) {
    config = config || {};
    config.fontSize = config.fontSize || '15px';
    config.fontFamily = config.fontFamily || 'monospace';
    config.promptInnerHTML = config.promptInnerHTML || '';
    config.color = config.color || '#eee';
    config.hintColor = config.hintColor || '#aaa';
    config.backgroundColor = config.backgroundColor || '#333';
    var updated = false;

    txtInput = document.createElement('input');
    txtInput.type = 'text';
    txtInput.spellcheck = false;
    txtInput.style.fontSize = config.fontSize;
    txtInput.style.fontFamily = config.fontFamily;
    txtInput.style.color = config.color;
    txtInput.style.backgroundColor = config.backgroundColor;
    txtInput.style.width = '100%';
    txtInput.style.outline = '0';
    txtInput.style.border = '0';
    txtInput.style.margin = '0';
    txtInput.style.padding = '0';

    //txtInput.style.display = 'inline';


    txtIrest = txtInput.cloneNode();
    txtIrest.style.position = 'absolute';
    txtIrest.style.top = '0';
    txtIrest.style.left = '0';
    txtIrest.style.backgroundColor = "transparent";


    var txtHint = txtInput.cloneNode();
    txtHint.disabled = '';
    txtHint.style.position = 'absolute';
    txtHint.style.top = '0';
    txtHint.style.left = '0';
    txtHint.style.borderColor = 'transparent';
    txtHint.style.boxShadow = 'none';
    txtHint.style.color = config.hintColor;
    txtHint.style.backgroundColor = "#333";



    // txtInput.style.opacity = '0';
    txtInput.style.backgroundColor = 'transparent';
    txtInput.style.verticalAlign = 'top';
    txtInput.style.position = 'relative';


    var wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.outline = '0';
    wrapper.style.border = '0';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';
    wrapper.style.width = '95%';
    //wrapper.style.display = 'inline';


    var prompt = document.createElement('div');
    prompt.style.position = 'absolute';
    prompt.style.outline = '0';
    prompt.style.margin = '0';
    prompt.style.padding = '0';
    prompt.style.border = '0';
    prompt.style.fontSize = config.fontSize;
    prompt.style.fontFamily = config.fontFamily;
    prompt.style.color = config.color;
    prompt.style.backgroundColor = config.backgroundColor;
    prompt.style.top = '0';
    prompt.style.left = '0';
    prompt.style.overflow = 'hidden';
    prompt.innerHTML = config.promptInnerHTML;
    prompt.style.background = 'transparent';
    if (document.body === undefined) {
        throw 'document.body is undefined. The library was wired up incorrectly.';
    }
    document.body.appendChild(prompt);
    var w = prompt.getBoundingClientRect().right; // works out the width of the prompt.
    wrapper.appendChild(prompt);
    prompt.style.visibility = 'visible';
    prompt.style.left = '-' + w + 'px';
    wrapper.style.marginLeft = w + 'px';


    wrapper.appendChild(txtHint);
    wrapper.appendChild(txtIrest);
    wrapper.appendChild(txtInput);

    container.appendChild(wrapper);

    var spacer;
    var leftSide; // <-- it will contain the leftSide part of the textfield (the bit that was already autocompleted)


    function calculateWidthForText(text) {
        if (spacer === undefined) { // on first call only.
            spacer = document.createElement('span');
            spacer.style.visibility = 'hidden';
            spacer.style.position = 'fixed';
            spacer.style.outline = '0';
            spacer.style.margin = '0';
            spacer.style.padding = '0';
            spacer.style.border = '0';
            spacer.style.left = '0';
            spacer.style.whiteSpace = 'pre';
            spacer.style.fontSize = config.fontSize;
            spacer.style.fontFamily = config.fontFamily;
            spacer.style.fontWeight = 'normal';
            document.body.appendChild(spacer);
        }

        // Used to encode an HTML string into a plain text.
        // taken from http://stackoverflow.com/questions/1219860/javascript-jquery-html-encoding
        spacer.innerHTML = String(text).replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return spacer.getBoundingClientRect().right;
    }


    var rs = {
        onArrowDown: function() {}, // defaults to no action.
        onArrowUp: function() {}, // defaults to no action.
        onEnter: function() {}, // defaults to no action.
        onTab: function() {}, // defaults to no action.
        onChange: function() {
            rs.repaint()
        }, // defaults to repainting.
        startFrom: 0,
        options: [],
        wrapper: wrapper, // Only to allow  easy access to the HTML elements to the final user (possibly for minor customizations)
        input: txtInput, // Only to allow  easy access to the HTML elements to the final user (possibly for minor customizations) 
        hint: txtHint, // Only to allow  easy access to the HTML elements to the final user (possibly for minor customizations)
        //dropDown :  dropDown,         // Only to allow  easy access to the HTML elements to the final user (possibly for minor customizations)
        prompt: prompt,
        setText: function(text) {
            txtHint.value = text;
            txtInput.value = text;
            txtIrest.value = text;
        },
        getText: function() {
            return txtInput.value;
        },
        hideDropDown: function() {
            //dropDownController.hide();
        },
        repaint: function() {
            var text = txtInput.value;

            txtIrest.value = text;
            if (text === "" || updated === true) {
                updated = false;
                return;
            }
            var startFrom = rs.startFrom;
            var options = rs.options;
            var optionsLength = options.length;
            var pos = doGetCaretPosition(txtInput);

            var old = keywords.concat(Object.keys(global))
            var kwords = text.match(/(\w{5,})/g);
            if (kwords !== null) {
                comp.options = $.unique(old.concat(kwords)).sort(function(a, b) {
                    return b.length - a.length; // ASC -> a - b; DESC -> b - a
                });
            }

            var startOfWord = pos - 1;
            var endOfWord = pos;
            for (; startOfWord >= 0; startOfWord--) {
                if (text[startOfWord] === ")" || text[startOfWord] === "(" || text[startOfWord] === " ") {
                    startOfWord++;
                    break;
                }
            }
            for (; endOfWord <= text.length; endOfWord++) {
                if (text[endOfWord] === "(" || text[endOfWord] === ")" || text[endOfWord] === " ") {
                    endOfWord--;
                    break;
                }
            }

            var token = text.substring(startOfWord, endOfWord + 1);
            var leftSide = text.substring(0, startOfWord);
            var rightSide = text.substring(pos, text.length);

            txtHint.value = '';
            if (token.length !== 0 && token !== " " && token !== ")" && token !== "(") {
                for (var i = 0; i < optionsLength; i++) {
                    var opt = options[i];
                    if (opt.indexOf(token) === 0) { // <-- how about upperCase vs. lowercase
                        txtHint.value = leftSide + opt;
                        var space = new Array(opt.length + 1 - token.length).join(" ");
                        txtIrest.value = leftSide + token + space + rightSide
                        txtInput.style.opacity = '0';
                        break;
                    }
                }
            } else {
                txtIrest.value = text;
            }
        }
    };

    var registerOnTextChangeOldValue;

    /**
     * Register a callback function to detect changes to the content of the input-type-text.
     * Those changes are typically followed by user's action: a key-stroke event but sometimes it might be a mouse click.
     **/
    var registerOnTextChange = function(txt, callback) {
        registerOnTextChangeOldValue = txt.value;
        var handler = function() {
            var value = txt.value;
            if (registerOnTextChangeOldValue !== value) {
                registerOnTextChangeOldValue = value;
                callback(value);
            }
        };

        //  
        // For user's actions, we listen to both input events and key up events
        // It appears that input events are not enough so we defensively listen to key up events too.
        // source: http://help.dottoro.com/ljhxklln.php
        //
        // The cost of listening to three sources should be negligible as the handler will invoke callback function
        // only if the text.value was effectively changed. 
        //  
        // 
        if (txt.addEventListener) {
            txt.addEventListener("input", handler, false);
            txt.addEventListener('keyup', handler, false);
            txt.addEventListener('change', handler, false);
        } else { // is this a fair assumption: that attachEvent will exist ?
            txt.attachEvent('oninput', handler); // IE<9
            txt.attachEvent('onkeyup', handler); // IE<9
            txt.attachEvent('onchange', handler); // IE<9
        }
    };


    registerOnTextChange(txtInput, function(text) { // note the function needs to be wrapped as API-users will define their onChange
        rs.onChange(text);
    });


    var keyDownHandler = function(e) {
        e = e || window.event;
        var keyCode = e.keyCode;

        if (keyCode == 33) {
            return;
        } // page up (do nothing)
        if (keyCode == 34) {
            return;
        } // page down (do nothing);

        if (keyCode == 27) { //escape
            //dropDownController.hide();
            txtHint.value = txtInput.value; // ensure that no hint is left.
            txtIrest.value = txtInput.value;
            txtInput.focus();
            txtInput.style.opacity = '1';
            return;
        }

        if (keyCode == 39 || keyCode == 35 || keyCode == 9) { // right,  end, tab  (autocomplete triggered)
            if (keyCode == 9) { // for tabs we need to ensure that we override the default behaviour: move to the next focusable HTML-element 
                e.preventDefault();
                e.stopPropagation();
                if (txtHint.value.length == 0) {
                    rs.onTab(); // tab was called with no action.
                    // users might want to re-enable its default behaviour or handle the call somehow.
                }
            }
            if (txtHint.value.length > 0) { // if there is a hint

                //txtInput.value = txtHint.value;
                txtInput.style.opacity = '1';
                updated = true;
                txtInput.value = txtHint.value + " " + txtIrest.value.slice(txtHint.value.length);
                txtIrest.value = txtInput.value;
                setCursor(txtInput, txtHint.value.length);
                txtHint.value = ''; // resets the txtHint. (it might be updated onKeyUp)


                var hasTextChanged = registerOnTextChangeOldValue != txtInput.value
                registerOnTextChangeOldValue = txtInput.value; // <-- to avoid dropDown to appear again. 
                // for example imagine the array contains the following words: bee, beef, beetroot
                // user has hit enter to get 'bee' it would be prompted with the dropDown again (as beef and beetroot also match)
                if (hasTextChanged) {
                    rs.onChange(txtInput.value); // <-- forcing it.
                }
            }
            return;
        }

        txtInput.style.opacity = '1';
        txtIrest.value = txtInput.value;
        txtHint.value = ''; // resets the txtHint. (it might be updated onKeyUp)

    };

    if (txtInput.addEventListener) {
        txtInput.addEventListener("keydown", keyDownHandler, false);
    } else { // is this a fair assumption: that attachEvent will exist ?
        txtInput.attachEvent('onkeydown', keyDownHandler); // IE<9
    }
    return rs;
}