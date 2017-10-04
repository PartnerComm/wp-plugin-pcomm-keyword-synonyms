jQuery(document).ready(function() {
	
	init_current_terms();
	
		
});

function init_current_terms()
{
	jQuery('#keyword_select').change(function(){
		
		var term = jQuery(this).val();
		
		var sel_data = {
			sel_term: term,
			action: 'pckm_get_syns_by_term'
		};
		
		jQuery.ajax({
			type: "POST",
			url: pckm_ajax.ajaxurl,
			data: sel_data,
			
			success: function(data){
				//alert(data);
				var id = '#pckm_syn_delete_container';
				jQuery(id).empty();
				jQuery(id).append(data);
				init_delete_terms();
				init_search_settings();
			}
		});
		//return false;
		
	});
}

function init_delete_terms()
{
	jQuery('#pckm_current_syns').submit(function(){
		
		var form_data = jQuery(this).serialize();
		//alert(form_data);
		jQuery.ajax({
			type: "POST",
			url: pckm_ajax.ajaxurl,
			data: form_data,
			
			success: function(data){
				var id = '#pckm_syn_delete_container';
				jQuery(id).empty();
				jQuery(id).append(data);
				init_delete_terms();
				init_search_settings();
			}
		});
		
		return false;
	});
}

function init_search_settings()
{
	jQuery('#pckm_sticky_keyword_form').submit(function(){

		var form_data = jQuery(this).serialize();
		//alert(form_data);
		jQuery.ajax({
			type: "POST",
			url: pckm_ajax.ajaxurl,
			data: form_data,

			success: function(data){
				var id = '#pckm_syn_delete_container';
				jQuery(id).empty();
				jQuery(id).append(data);
				init_delete_terms();
				init_search_settings();
			}
		});

		return false;
	});

	jQuery('#sticky_settings').click(function() {
		jQuery('#pckm_sticky_keyword_form').slideToggle('slow');
	});
}

