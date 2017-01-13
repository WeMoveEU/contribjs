//HOTFIX
//This shold ideally be in common with contrib.js, and return the page id.
function readPageId() {
  return undefined;
}
//END HOTFIX

jQuery(function($) {
  /* Hide ab testing profile block on thankyou page */
  var ab_testing_prefix = 'AB-TESTING';
  var prf = jQuery('fieldset.crm-profile-view .header-dark');
  if (prf.text().indexOf(ab_testing_prefix) == 0) {
    prf.parent().hide();
  }
});
