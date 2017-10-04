var qf_autocomplete = (function($, w) {

	function initAutoComplete() {
		var keywords = new Bloodhound({
			datumTokenizer: function (datum) {
				return Bloodhound.tokenizers.whitespace(datum.value);
			},
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			prefetch: {
				url: '/wp-json/pcqf/v1/syns',
				wildcard: '%QUERY',

				filter: function (keywords) {
					return $.map(keywords, function (keyword) {
						return {
							value: removeSlashes(keyword.synonym),
							term_id: keyword.term_id,
							child_name: removeSlashes(keyword.term_name),
							child_slug: keyword.term_slug,
							parent_slug: keyword.parent_slug,
							parent_name: removeSlashes(keyword.parent_name),
							sticky: keyword.sticky
						};
					});
				}
			},

			remote: {
				url: '/wp-json/pcqf/v1/syns',
				wildcard: '%QUERY',

				filter: function (keywords) {
					return $.map(keywords, function (keyword) {
						//console.log(keyword);
						return {
							value: removeSlashes(keyword.synonym),
							term_id: keyword.term_id,
							child_name: removeSlashes(keyword.term_name),
							child_slug: keyword.term_slug,
							parent_slug: keyword.parent_slug,
							parent_name: removeSlashes(keyword.parent_name),
							sticky: keyword.sticky
						};
					});
				}
			},

			sufficient: 0,

			sorter: function(a, b) {
				// start a timer to see how long this takes
				// console.time("Sort results");

				// get the input value from typeahead
				var input_array = $('.typeahead.tt-input').val().toLowerCase().split(' '),

				// create an array of the words in a
				// make lowercase because we're using indexOf below
				// which is case sensitive
					a_words_array = a.value.toLowerCase().split(' '),

				/* add the parent to that array
				 this adds the parent term to the array used for scoring
				 but it makes a result like 'Advance Medical in Medical' score higher (16) than
				 'Medical Second Opinion Service in Medical' (15)
				 so i left it turned off for now */
				// a_words_array = a_words_array.concat(a.parent_name.toLowerCase().split(' ')),

				// save the array length to a variable for use in for loop
					a_words_length = a_words_array.length,

				// create empty scores array
					a_words_scores = [],

				// create an array of the words in b
					b_words_array = b.value.toLowerCase().split(' '),

				/* add the parent to that array
				 add the parent to that array
				 this adds the parent term to the array used for scoring
				 but it makes a result like 'Advance Medical in Medical' score higher (16) than
				 'Medical Second Opinion Service in Medical' (15)
				 so i left it turned off for now */
				// b_words_array = b_words_array.concat(b.parent_name.toLowerCase().split(' ')),

				// save the array length to a variable for use in for loop
					b_words_length = b_words_array.length,

				// create empty scores array
					b_words_scores = [],

				// this is the value for the first word in the array
				// we'll subtract the index of subsequent words from here to diminish their score
				// didn't want to start with 5 in the event that some synonyms have more than 5 words (creating a 0 or negative score for words beyond the 5th
				// could be any reasonably high arbitrary number but 10 should be enough
					top_word_score = 10;


				// testing alt method of getting scores, using input array instead of word array
				// get longest length of a result
				var longest_array = Math.max(a_words_array.length, b_words_array.length);
				// get shortest length of a result
				var shortest_array = Math.min(a_words_array.length, b_words_array.length);
				// create arrays to saved scored words (so they aren't scored twice on nested each loop
				var a_scored_words = [];
				var b_scored_words = [];

				// loop over the user input words
				$.each(input_array, function(index, value) {
					// loop over the words in a
					$.each(a_words_array, function(key, cell) {
						// if the word from a is in the user input and it's not already been scored
						if ( cell.indexOf(value) !== -1 && a_scored_words.indexOf(cell) == -1 ) {
							// this is my janky way of making each word weigh less than the one before it in a result
							// basically, it takes the top word score (10), subtracts the index of the word in the word array
							// so 10 - the first word (0) would be 10, 10 minus the second word (1) would be 9, etc
							// and then multiplies that by the result of multiplying the position of the matching word
							// from the user input * 2 and subtracting that from the longest array
							// honestly, it made sense when i was working on it late at night and looking now i'm confused
							// but it seems to do the trick for most results i've tested, not all, but it's better than it was before
							a_words_scores.push( (top_word_score - key) * ( longest_array - ( index * 2 ) ) );
							// store the word that we just scored so we don't score it twice
							a_scored_words.push(cell);
						}
					});
				});

				$.each(input_array, function(index, value) {
					$.each(b_words_array, function(key, cell) {
						if ( cell.indexOf(value) !== -1 && b_scored_words.indexOf(cell) == -1 ) {
							b_words_scores.push( (top_word_score - key) * ( longest_array - ( index * 2 ) ) );
							b_scored_words.push(cell);
						}
					});
				});

				// cut out the scores for words that were beyond the shortest term
				// this way, longer terms with fewer matches don't arbitrarily score higher
				// again, there is likely a better way to do this but i couldn't get there yet
				a_words_scores.splice(shortest_array);
				b_words_scores.splice(shortest_array);

				// sticky setting to force to top of autocomplete is added to a term in the keyword synonyms manager
				// add the sticky value to the a word score if it exists
				if (a.sticky !== null) {
					a_words_scores.push(a.sticky * 10);
				}

				// add the sticky value to the b word score if it exists
				if (b.sticky !== null) {
					b_words_scores.push(b.sticky * 10);
				}

				// get total scores for a and b
				// probably a more elegant way to do this
				var total_a_score = 0
				// iterate over the scores in the array
				// and add them together
				$.each(a_words_scores, function() {
					total_a_score += this;
				});

				// get total score for b
				var total_b_score = 0
				$.each(b_words_scores, function() {
					total_b_score += this;
				});

				a.sort_score = total_a_score;
				b.sort_score = total_b_score;

				// LOG DATA TO CONSOLE FOR DEBUGGING PURPOSES
				//console.group("Sorter data for '%s' vs '%s' with user input of '%s'", a.value, b.value, input_array.join(' '));
				//console.log('scores for individual A words', a_words_scores);
				//console.log(a.value + ' total score', total_a_score);
				//console.log('scores for individual B words', b_words_scores);
				//console.log(b.value + ' total score', total_b_score);
				//console.groupEnd();

				// end timer to see how long this function took for each sort
				// console.timeEnd("Sort results");

				if ( total_a_score > total_b_score ) {
					return -1;
				}
				else if ( total_a_score < total_b_score) {
					return 1;
				}
				else {
					return 0;
				}


			}
		});

		// Initialize the Bloodhound suggestion engine
		keywords.clear();
		keywords.clearPrefetchCache();
		keywords.initialize(true);

		// console.log(keywords.ttAdapter());
		// Instantiate the Typeahead UI
		$('.typeahead').typeahead({
				hint: true,
				highlight: true,
				minLength: 1
			},
			{
				name: 'children',
				displayKey: 'value',
				hint: true,
				hightlight: true,
				source: keywords.ttAdapter(),
				limit: 10,
				templates: {
					// notFound: Handlebars.compile("<div data-slug=''><p><strong>No results found.</strong></p></div>"),
					notFound: function(data) {
						console.log(data);
						return 'Nothing';
					},
					suggestion: Handlebars.compile("<div data-score='{{sort_score}}' data-slug='{{child_slug}}' data-value='{{value}}'><p>{{value}}</p></div>") //,
					// footer: Handlebars.compile("<strong>Searched for '{{query}}'</strong>")
				}

			});

		$('#quickfind_submit_reg').click(function(e) {
			e.preventDefault();
			var keys = $('#quickfind_hidden').data();
			var path = '/keyword/' + keys.childslug + '/?' + $.param(keys, true);

			trackQFSearch(keys);

			window.location.href = path;

		});

		$('.typeahead').bind(['typeahead:autocomplete','typeahead:select', 'typeahead:cursorchange', 'typeahead:render'].join(' '), function(ev, suggestion) {
			$('#quickfind_submit_reg').removeAttr('disabled');
			inputChangeOn();

			if (suggestion) {
				$('#quickfind_hidden')
					.data('childslug', suggestion.child_slug)
					.data('syn', suggestion.value)
					.data('parentslug', suggestion.parent_slug)
					.data('parentname', suggestion.parent_name);
			}
		});


		// added by jason 9/24/15
		// updated by jason 6/29/2016 to take into account scoring
		// not sure of the viablity of this solution
		// when a results are rendered (event occurs on every dataset change)
		// filter all results and only show the first unique one
		// for any given keyword child term
		$('.typeahead').bind('typeahead:render', function(ev, suggestion) {
			// suggestion was undefined sometimes, not sure why, but no sense in doing any of this if there's no suggestion
			if (suggestion !== undefined) {

				// get suggestion element
				var $suggestion = $('.tt-suggestion[data-value="' + suggestion.value + '"]');

				// set up some arrays we'll use
				var terms = [],
					same_slugs = [],
					scores = [];

				// create an array of the terms in the suggestions
				$('.tt-dataset').children('.tt-suggestion').map(function (i) {
					terms[i] = $(this).data('slug');
				});


				// get the unique terms from that array of suggestions
				var uniq = terms
					.map(function(name) {
						return {count: 1, name: name}
					})
					.reduce(function(a, b) {
						a[b.name] = (a[b.name] || 0) + b.count
						return a;
					}, {});

				// find the duplicate terms and make an array of them
				var duplicates = Object.keys(uniq).filter(function(a) {
					return uniq[a] > 1;
				});

				// loop over duplicates array
				for (var i = 0; i < duplicates.length; i++) {
					scores = [];
					// for each duplicate suggestion
					$('.tt-suggestion[data-slug="' + duplicates[i] + '"]').each(function (i) {
						// save it's score to the scores array
						scores.push($(this).data('score'));
						// and hide them
					}).hide();

					// sort the scores array from high to low
					scores.sort(function (a, b) {
						return b - a;
					});

					//console.log(scores[0]);
					//console.log(duplicates[i]);

					// get the first suggestion with that value and the highest score (first value in scores array)
					// and show it
					$('.tt-suggestion[data-slug="' + duplicates[i] + '"][data-score="' + scores[0] + '"]:eq(0)').show();

				}

				//Remove the hidden options so they are not selectable
				$('.tt-suggestion:hidden').remove();

				// sort the remaining suggestions from highest score to lowest
				// in theory this should already be done in the sorter function
				// but it hasn't been perfect. this appears to do the trick
				// get the wrapper that holds the results
				var $wrapper = $('.tt-dataset');
				// sort the results based on their score
				$wrapper.children('.tt-suggestion').sort(function (a, b) {
						return $(b).data('score') - $(a).data('score');
					})
					// and append to the wrapper
					.appendTo($wrapper);
			}

		});

		$('.typeahead').bind('typeahead:selected', function(obj, datum, name) {
			$('#quickfind_submit_reg').trigger('click');
		});

	}

	function inputChangeOn() {
		$(".typeahead.tt-input").on("propertychange change keyup paste input", function(){

			var currentVal = $(this).val();
			var currentSelect = $('#quickfind_hidden').data('syn');

			// console.log(currentVal + " = " + currentSelect);

			// if (currentVal != currentSelect) {
			if ( currentVal === '' || $('.tt-empty').length === 0 ) {
				$('.tt-menu-no-results-found').hide();
			}
			else {
				clearSelect();
				$('.tt-menu-no-results-found').show();
			}

		});

		$(".typeahead.tt-input").on('blur', function() {
			$('.tt-menu-no-results-found').hide();
		});
	}

	function inputChangeOff() {
		$(".typeahead.tt-input").off();
	}

	function clearSelect() {
		$('#quickfind_submit_reg').attr('disabled', 'disabled');
		$('#quickfind_hidden')
			.data('childslug', '')
			.data('syn', '')
			.data('parentslug', '')
			.data('parentname', '');

		// inputChangeOff();
	}

	function removeSlashes(str) {
		return str.replace(/\\/g, '');
	}

	function trackQFSearch(keys) {

		var fromterm = getUrlVars(window.location.href);

		if(location.search === '') {
			var loc = location.pathname;
		}
		else {
			if(fromterm.syn) {
				var loc = decodeString(fromterm.syn);
			}
			else {
				var loc = 'no previous term';
			}
		}

		pcommAnalytics.trackAnalyticsEvent({
			category: 'Quick Find Search',
			action: 'Searched: ' + keys.syn,
			label: 'Previous Term: ' + loc
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


	return {
		init: function() {
			initAutoComplete();
		}
	};

})(jQuery, window, undefined);

qf_autocomplete.init();