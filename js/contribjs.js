jQuery('.crm-section.is_recur-section > .label').remove();

jQuery('.price-set-row input').on('change', function(e) {
  var $other = jQuery('.crm-container .crm-section.other_amount-section'); 
  var val = jQuery(this).val();
  if (val == 0) {
    $other.show();
  } else {
    $other.hide();
  }
});
