<?php
/*
Plugin Name: PComm Keyword Synonym Manager
Plugin URI: http://www.pcommsites.com
Description: This plugin manages the sysnonyms for Relevanssi. The Relevanssi plugin must be installed and activated.
Version: 0.1
Author: Chadwick Cole
Author URI: 
*/

/********** CONSTANTS ************/
define('PCKMURL', WP_PLUGIN_URL . "/" . dirname(plugin_basename(__FILE__)));
define('PCKMUPATH', WP_PLUGIN_DIR . "/" . dirname(plugin_basename(__FILE__)));

// Installation method
register_activation_hook(__FILE__, 'pckm_install');

// Add the admin page
add_action('admin_menu', 'pckm_add_page', 11);

// Register settings
add_action('admin_init', 'pckm_admin_init');

// CSS and Scripts
add_action('admin_enqueue_scripts', 'pckm_enqueue_styles', 12);
add_action('admin_enqueue_scripts', 'pckm_enqueue_scripts');

// Scripts for front-end
add_action('wp_enqueue_scripts', 'pckm_enqueue_frontend_scripts');

// sets up our wp ajax actions
add_action('wp_ajax_pckm_get_syns_by_term', 'pckm_get_syns_by_term');
add_action('wp_ajax_nopriv_pckm_get_syns_by_term', 'pckm_get_syns_by_term');
add_action('wp_ajax_pckm_delete_terms', 'pckm_delete_terms');
add_action('wp_ajax_nopriv_pckm_delete_terms', 'pckm_delete_terms');
add_action('wp_ajax_pckm_set_sticky', 'pckm_set_sticky');
//add_action('wp_ajax_nopriv_pckm_set_sticky', 'pckm_set_sticky');

// remove synonym from synonyms table on keyword delete
add_action('delete_term', 'pckm_delete_synonym_on_term_delete');

// update synonym in synonyms table on keyword edit
add_action('edited_term', 'pckm_update_synonym_on_term_edit');

// ajax for quickfind autocomplete
add_action('wp_ajax_pckm_autocomplete_search', 'pckm_autocomplete_search');
add_action('wp_ajax_nopriv_pckm_autocomplete_search', 'pckm_autocomplete_search');


// ********************************************************************************************
// ************************************* INSTALL METHOD ***************************************

// Install and create table
function pckm_install()
{
    global $wpdb;
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

    $tablename = $wpdb->prefix . "pcomm_synonyms";

    $sql = "CREATE TABLE `$tablename` (
	  `uid` int(11) NOT NULL AUTO_INCREMENT,
	  `term_id` int(11) NOT NULL,
	  `term_name` varchar(255) NOT NULL,
		`term_slug` varchar(255) NOT NULL,
	  `parent_id` int(11) NOT NULL,
	  `parent_name` varchar(255) NOT NULL,
		`parent_slug` varchar(255) NOT NULL,
	  `synonym` varchar(255) NOT NULL,
	  `sticky` int(11) NULL,
	  PRIMARY KEY (`uid`)
	);";

    dbDelta($sql);
}

// ********************************************************************************************
// ******************************** ADMIN PAGES AND SETTINGS **********************************

// Add admin page
function pckm_add_page()
{
    //add_options_page('PComm Keyword Synonyms', 'PComm Keyword Synonyms', 'manage_options', __FILE__, 'pckm_options_page');
    add_submenu_page('pcomm-quick-find', 'Keyword Synonyms', 'Keyword Synonyms', 'manage_options', 'keyword-synonyms', 'pckm_options_page');
}

// Add Javascript
function pckm_enqueue_scripts()
{
    wp_enqueue_script('pckm-js', PCKMURL . '/js/pcomm-keyword-manager.js', array('jquery'));
    wp_localize_script('pckm-js', 'pckm_ajax', array('ajaxurl' => admin_url('admin-ajax.php')));
}

function pckm_enqueue_frontend_scripts()
{
    //wp_enqueue_script('pckm-js', plugins_url( '/js/pcomm_quickfind_autocomplete.js', __FILE__ ), array('jquery', 'pcomm-analytics'), '', true);
    wp_enqueue_script('bloodhound', plugins_url('/js/lib/bloodhound.js', __FILE__), array('jquery'), '', true);
    wp_enqueue_script('typeahead', plugins_url('/js/lib/typeahead.jquery.js', __FILE__), array('jquery'), '', true);
    wp_enqueue_script('handlebars', plugins_url('/js/lib/handlebars-v3.0.3.js', __FILE__), array('jquery'), '', true);
    wp_enqueue_script('pckm-js', plugins_url('/js/pcomm_typeahead_autocomplete.js', __FILE__), array('jquery'), '', true);
    wp_localize_script('pckm-js', 'pckm_ajax', array('ajaxurl' => admin_url('admin-ajax.php')));
}

// Add CSS
function pckm_enqueue_styles()
{
    wp_enqueue_style('pckm-style', PCKMURL . '/css/pcomm-keyword-manager.css', array(), '');
}

// Options page render form
function pckm_options_page()
{
    ?>

    <div class="wrap">
        <?php screen_icon(); ?>
        <h2>PComm Keyword Synonym Manager</h2>
        <form action="options.php" method="post">
            <?php settings_fields('pckm_options'); ?>
            <?php do_settings_sections(__FILE__); ?>
            <p class="submit"><input name="Submit" class="button-primary" type="submit" value="Save New Synonyms"/></p>

        </form>


        <div id="pckm_syn_delete_container"></div>

    </div>

    <?php
}

// Define settings
function pckm_admin_init()
{
    register_setting('pckm_options', 'pckm_options', 'pckm_validate_options');
    add_settings_section('pckm_keyword_section', 'Keyword Synonym Management', 'pckm_keyword_section_text', __FILE__);
    add_settings_field('pckm_keyword_terms', 'Select keyword term from menu select.', 'pckm_keyword_select', __FILE__, 'pckm_keyword_section');
    add_settings_field('pckm_synonym_text', 'Enter new synonyms for the selected term (separated by comma space).', 'pckm_synonym_textarea', __FILE__, 'pckm_keyword_section');
    //add_settings_section('pckm_sticky_section', 'Advanced Options', 'pckm_sticky_section_text', __FILE__);
    //add_settings_field('pckm_sticky_keyword', 'Make synonym sticky to appear at the top of autocomplete suggestions.', 'pckm_sticky_checkbox', __FILE__, 'pckm_sticky_section');
}

// Text describing section called from register_settings()
function pckm_keyword_section_text()
{
    echo '<p>Select a term from the Keyword Taxonomy and add synonyms for each.</p>';
}

// Text describing section called from register_settings()
function pckm_sticky_section_text()
{
    echo '<p><strong>IMPORTANT: </strong>Use this setting only if you need to force this term to the top of the autocomplete suggestion list. Use sparingly.</p>';
}

// Build select form element of keywords and parents
function pckm_keyword_select()
{
    // get keyword terms Keyword taxonomy
    $args = array(
        'taxonomy' => 'keyword',
        'order' => 'ASC',
        'orderby' => 'name',
        'hide_empty' => 0
    );

    $terms = get_terms('keyword', $args);

    // Build select tag
    $select = '<select id="keyword_select" name="pckm_keyword_terms">';

    $select .= '<option name="none" value="">-- CHOOSE A TERM --</option>';

    foreach ($terms as $term) {
        if ($term->parent) {
            $parent = get_term($term->parent, 'keyword');
            $value = $term->name . "|" . $term->term_id . "|" . $parent->name . "|" . $parent->term_id . "|" . $term->slug . "|" . $parent->slug;
            $label = $term->name . ' in ' . $parent->name;
        } else {
            $value = $term->name . "|" . $term->term_id . "|" . $term->name . "|" . $term->term_id . "|" . $term->slug . "|" . $term->slug;
            $label = $term->name;
        }

        $select .= '<option name="' . $term->slug . '" value="' . $value . '">' . $label . '</option>';
    }

    $select .= '</select>';

    //$pre = '<pre>' . print_r($terms) . '</pre>';

    echo $select;
}

// Build textarea form element for synonyms
function pckm_synonym_textarea()
{
    $textarea = '<textarea id="synonym_textarea" name="pckm_synonym_text" value="" rows="4" cols="70"></textarea>';

    echo $textarea;
}

// Build sticky checkbox
function pckm_sticky_checkbox()
{
    //$checkbox = '<p><a href="#pckm_sticky">Advanced options</a></p>';
    $checkbox = '<input type="checkbox" name="pckm_sticky_keyword" id="pckm_sticky" value="10">';

    echo $checkbox;
}

// Callback function on form
function pckm_validate_options()
{
    global $wpdb;
    $tablename = $wpdb->prefix . "pcomm_synonyms";

    $selected_term = explode("|", $_POST['pckm_keyword_terms']);
    $new_synonyms = explode(", ", $_POST['pckm_synonym_text']);

    if (isset($_POST['pckm_sticky_keyword']) || !empty($_POST['pckm_sticky_keyword'])) {
        $sticky = $_POST['pckm_sticky_keyword'];
    } else {
        $sticky = null;
    }

    foreach ($new_synonyms as $syn) {
        $data = array(
            'term_name' => $selected_term[0],
            'term_id' => $selected_term[1],
            'parent_name' => $selected_term[2],
            'parent_id' => $selected_term[3],
            'term_slug' => $selected_term[4],
            'parent_slug' => $selected_term[5],
            'synonym' => $syn,
            'sticky' => $sticky
        );

        $format_values = array('%s', '%d', '%s', '%d', '%s');

        $wpdb->insert($tablename, $data, $format_values);
    }
}

// Ajax method to return current synonyms if any
function pckm_get_syns_by_term()
{
    global $wpdb;

    $term = explode("|", $_POST['sel_term']);
    $term_id = $term[1];

    echo pckm_current_term_form($term_id);

    die();
}

function pckm_delete_terms()
{
    global $wpdb;
    $tablename = $wpdb->prefix . "pcomm_synonyms";

    if (isset($_POST['synonyms'])) {
        $del_syns = $_POST['synonyms'];

        foreach ($del_syns as $dsyn) {

            $wpdb->query(
                $wpdb->prepare(
                    "
			     DELETE FROM $tablename
					 WHERE uid = %d
					",

                    $dsyn
                )
            );

        }
    }


    echo pckm_current_term_form($_POST['sel_term_id']);

    die();
}

function pckm_set_sticky()
{
    global $wpdb;

    $tablename = $wpdb->prefix . "pcomm_synonyms";

    $term_id = $_POST['sticky_term_id'];

    if (isset($_POST['sticky_check']) && !is_null($_POST['sticky_check'])) {
        $sticky = $_POST['sticky_check'];

        $wpdb->query(
            $wpdb->prepare(
                "
        UPDATE $tablename
        SET sticky = %d
        WHERE term_id = %d
        ",
                array($sticky, $term_id)
            )
        );

    } else {

        $wpdb->query(
            $wpdb->prepare(
                "
        UPDATE $tablename
        SET sticky = null
        WHERE term_id = %d
        ",
                array($term_id)
            )
        );
    }

    echo pckm_current_term_form($term_id);

    die();
}

function pckm_current_term_form($term_id)
{
    global $wpdb;
    $tablename = $wpdb->prefix . "pcomm_synonyms";

    $syns = $wpdb->get_results(
        "
		SELECT * 
		FROM $tablename
		WHERE term_id = $term_id
		"
    );

    $html = '<form id="pckm_current_syns" action="" method="post">' .
        '<h3>Manage Assigned Synonyms</h3>' .
        '<p>Choose current synonyms to remove association to selected keyword term.</p>' .
        '<table class="form-table">' .
        '<tbody>' .
        '<tr align="top"><th scope="row">Current associated synonyms.</th>' .
        '<td align="top">';

    if (!$syns) {
        $html .= '<p class="no_syns_msg">Sorry. There are no synonyms currently associated with the selected keyword.</p>';

        $html .= '</td></tr></tbody></table>
						</form>';
    } else {
        $html .= '<ul id="pckm_syn_list">';
        foreach ($syns as $syn) {
            $html .= '<li><input type="checkbox" id="synonym_' . $syn->uid . '" name="synonyms[]" value="' . $syn->uid . '" />';
            $html .= '<label for="synonym_' . $syn->uid . '">' . $syn->synonym . '</label></li>';

        }
        $html .= '</ul>';
        $html .= '</td></tr></tbody></table>
							<input type="hidden" name="action" value="pckm_delete_terms" />
							<input type="hidden" name="sel_term_id" value="' . $term_id . '" />
							<p class="submit"><input class="button-primary" type="submit" value="Delete Selected Synonyms" /></p>
						</form>';
    }

    $html .= '<h3>Advanced Search Settings <a id="sticky_settings" class="button" href="#pckm_sticky_form">Show/Hide Settings</a></h3>';
    $html .= '<p></p>';

    $html .= '<form id="pckm_sticky_keyword_form" action="" method="post" style="display:none">' .
        '<p><strong>IMPORTANT: </strong>Use this setting only if you need to force this term to the top of the autocomplete suggestion list. Use sparingly.</p>' .
        '<table class="form-table">' .
        '<tbody>' .
        '<tr align="top"><th scope="row">Make Synonyms sticky.</th>' .
        '<td align="top">';

    //debug(is_null($syns[0]->sticky));

    if (is_null($syns[0]->sticky)) {
        $html .= '<input type="checkbox" name="sticky_check" id="sticky_check" value="10">';
    } else {
        $html .= '<input type="checkbox" checked="checked" name="sticky_check" id="sticky_check" value="10">';
    }

    $html .= '</td></tr></tbody></table>
							<input type="hidden" name="action" value="pckm_set_sticky" />
							<input type="hidden" name="sticky_term_id" value="' . $term_id . '" />
							<p class="submit"><input class="button-primary" type="submit" value="Update Search Settings" /></p>
						</form>';

    return $html;
}

// ********************************************************************************************
// ******************************** ADMIN PAGES AND SETTINGS **********************************

// Remove synonyms from DB when child keyword is deleted
function pckm_delete_synonym_on_term_delete($term)
{
    global $wpdb;

    $tablename = $wpdb->prefix . "pcomm_synonyms";

    $wpdb->query(
        $wpdb->prepare(
            "
        DELETE FROM $tablename
        WHERE term_id = %d
        ",
            $term
        )
    );
}

// Update synoyms in synonym table when keyword is updated
function pckm_update_synonym_on_term_edit($term_id)
{
    global $wpdb;

    $edited_term = get_term($term_id, 'keyword');

    if (!empty($edited_term)) {
        $tablename = $wpdb->prefix . "pcomm_synonyms";

        $args = array($edited_term->slug, $edited_term->name, $term_id);

        $wpdb->query(
            $wpdb->prepare(
                "
        UPDATE $tablename
        SET term_slug = %s, term_name = %s
        WHERE term_id = %d
        ",
                $args
            )
        );

    }

}

// Primary Ajax method of for autocomplete suggestions
function pckm_autocomplete_search()
{
    global $wpdb;

    // user input in primary #quickfind_input
    if (isset($_POST['quickfind_input'])) {
        // escape string before querying the database
        $user_input = $wpdb->escape($_POST['quickfind_input']);

        // test string length (make this number anything you like)
        if (strlen($user_input) > 1) {

            // $results = $wpdb->get_results($wpdb->prepare(
            // "
            // SELECT *
            // FROM wp_pcomm_synonyms
            // WHERE synonym
            // LIKE '%%%s%%'
            // ORDER BY parent_id
            // LIMIT 20
            // ",
            // $user_input
            // )); b

            $results = $wpdb->get_results($wpdb->prepare(
            // "
            // SELECT *,
            // MATCH(synonym) AGAINST('$user_input*') AS relevance
            // FROM wp_pcomm_synonyms
            // WHERE MATCH(synonym) AGAINST('*$user_input*' IN BOOLEAN MODE)
            // HAVING relevance > 0.2
            // ORDER BY relevance DESC
            // "

                "
			SELECT *,
			MATCH(synonym,parent_name) AGAINST('*$user_input*' IN BOOLEAN MODE) AS combined_relevance,
			MATCH(parent_name) AGAINST('+$user_input* -plans' IN BOOLEAN MODE) AS parent_relevance,
			MATCH(synonym) AGAINST('*$user_input*' IN BOOLEAN MODE) AS synonym_relevance,
			MATCH(synonym) AGAINST('$user_input') AS synonym_score,
			MATCH(synonym,parent_name) AGAINST('$user_input') AS combined_score
			FROM wp_pcomm_synonyms
			WHERE MATCH(synonym,parent_name) AGAINST('*$user_input*' IN BOOLEAN MODE)
			HAVING combined_relevance > 0.2
			ORDER BY combined_relevance DESC, synonym_relevance DESC, parent_relevance DESC, synonym_score DESC, combined_score DESC
			LIMIT 13
			"

            // "
            // SELECT *,
            // MATCH(synonym,parent_name) AS relevance
            // FROM wp_pcomm_synonyms
            // WHERE MATCH(synonym)
            // AGAINST('*$user_input*' IN BOOLEAN MODE)
            // ORDER BY relevance DESC
            // "

            ));

            // SELECT *,
            //    MATCH(synonym) AGAINST('*$user_input*' IN BOOLEAN MODE) AS score
            //    FROM wp_pcomm_synonyms
            //    WHERE MATCH(synonym) AGAINST('*$user_input*' IN BOOLEAN MODE)
            //    ORDER BY score DESC

            if ($results) {
                //debug($results);
                // create HTML to pass back to Ajax call
                $html = '<p id="quickfind_results">';

                // zero out $parent_id to track when parent changes
                $parent_id = 0;

                foreach ($results as $res) {
                    // add parent separator if != to current $parent_id
                    // if($res->parent_id != $parent_id)
                    // {
                    // 	$html .= '<span class="result_parent">Section: ' . $res->parent_name . '</span>';
                    // 	$parent_id = $res->parent_id;
                    // }


                    // add link to taxonomy term
                    $html .= '<a href="/keyword/' . $res->term_slug . '/?syn=' . urlencode($res->synonym) . '"><span class="result_child">' . stripslashes($res->synonym) . '<em> in ' . stripslashes($res->parent_name) . '</em></span></a>';
                }

                // close opening p tag
                $html .= '</p>';
            } // Return error if no results
            else {
                $html = '<p id="quickfind_results" class="noresults">Search is too general or not found. Try being more specific.</p>';
            }

            echo $html;

        }
    }

    die();
}


?>