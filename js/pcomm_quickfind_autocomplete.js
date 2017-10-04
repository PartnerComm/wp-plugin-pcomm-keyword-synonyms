jQuery(document).ready(function() {
	
	init_quickfind();
	select_results(); 
		
});

function init_quickfind()
{
	jQuery("#quickfind_input").keyup(function(){
		
		var $this = jQuery(this),
			str = jQuery(this).val(),
			container = jQuery("#quickfind_suggestions");
		
		if(str.length <= 1)
		{
			$this.removeClass('active');
			container.fadeOut();
		}
		else
		{
			var search_data = {
				quickfind_input: str,
				action: 'pckm_autocomplete_search'
			};

			jQuery.ajax({
				type: "POST",
				url: pckm_ajax.ajaxurl,
				data: search_data,

				success: function(data){
					//alert(data);
					container.empty();
					container.append(data);
					container.show();
					$this.addClass('active');
					getQFclicks();
				}
			});
		}
		
	});

}

function getQFclicks() {
	jQuery('#quickfind_results a').click(function() {
		var href = jQuery(this).attr('href');
		var qvars = getUrlVars(href);
		var decode = decodeString(qvars.syn);

		var fromterm = getUrlVars(window.location.href);

		//console.log(fromterm.syn);
		//debugger;

		if(location.search === '') {
			var loc = location.origin;
			//console.log(loc);
			//debugger;
		} 
		else {
			var loc = decodeString(fromterm.syn);
			//console.log(loc);
			//debugger;
		}
		

		pcommAnalytics.trackAnalyticsEvent({
	        category: 'Quick Find Search',
	        action: 'Searched: ' + decode,
	        label: 'Previous Term: ' + loc
	      });

		//debugger;
	});
}

function decodeString(string) {
	return decodeURIComponent(string.replace(/\+/g, '%20'));
}

function getUrlVars(href)
{
    var vars = [], hash;
    var hashes = href.slice(href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function select_results() {
	
	var i = 0, // iterator to keep track of which result we're on
		in_results = false,
		$active = 0;
		
	jQuery(document).on('keydown', '#quickfind_input, #quickfind_results a', function(e) {
		// check if the input was selected, if so, revert $active and i
		if (e.target.id === 'quickfind_input') {
			clear_active();
		}
		var $results = jQuery('#quickfind_results'),
			key = e.which,
			$first = $results.children('a').first();

		// if down arrow
		if (key === 40) {
			in_results = true;
			if (i === 0) {
				$active = $first.focus().addClass('selected');
			}
			else {
				$active = $active.removeClass('selected').next('a').focus().addClass('selected');
				
			}
			i = i + 1;
		}
		// if up arrow
		else if (key === 38) {
			if (i === 1) {
				// setCaretAtEnd(document.getElementById('quickfind_input'));
				jQuery('#quickfind_input').focus();
				clear_active();
			}
			else {
				$active = $active.removeClass('selected').prev('a').focus().addClass('selected');
				i = i -1;
			}
			
		}
		else if (key === 13) {
			if (!$results.children('a').hasClass('selected')) {
				$active = $results.children('a').first().focus();
				$active[0].click();
			}
		}

		
	});

	jQuery('#quickfind_form').on('submit', function(e) {
		e.preventDefault();
	});

	jQuery('#quickfind_input').on('focus', function(e) {
		jQuery('#quickfind').removeClass('off');
		jQuery('#quickfind').find('.quickfind_pad').slideDown('fast');
		// jQuery('.quickfind_min').hide();
		// jQuery('#quickfind_input').focus();
	});
	
	
	jQuery('#quickfind_submit_reg').on('click', function() {
		// alert('clicked');
		var $results = jQuery('#quickfind_results');
		if ($results.children('a').hasClass('selected')) {
			$active = $results.children('a.selected').focus();
		}
		else {
			$active = $results.children('a').first().focus();
		}

		$active[0].click();
	});

	var clear_active = function() {
		$active = '';
		i = 0;
		
	};

	var setCaretAtEnd = function(elem) {
		var elemLen = elem.value.length;
		// For IE Only
		if (document.selection) {
			// Set focus
			elem.focus();
			// Use IE Ranges
			var oSel = document.selection.createRange();
			// Reset position to 0 & then set at end
			oSel.moveStart('character', -elemLen);
			oSel.moveStart('character', elemLen);
			oSel.moveEnd('character', 0);
			oSel.select();
		}
		else if (elem.selectionStart || elem.selectionStart == '0') {
			// Firefox/Chrome
			elem.selectionStart = elemLen;
			elem.selectionEnd = elemLen;
			elem.focus();
		} // if
	};

}
