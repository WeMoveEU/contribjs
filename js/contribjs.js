function getParam(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

// set default amount based on param donation_amount in url
var name = 'donation_amount';
var da = getParam(name);
if (da > 0) {
  da = da.replace('.', '\\.');
  jQuery(".price-set-row input[data-amount="+da+"]").prop("checked", true).click();
}

//Show / hide other amount input
jQuery('.price-set-row input').on('change', function(e) {
  var $other = jQuery('.crm-container .crm-section.other_amount-section'); 
  var val = jQuery(this).val();
  if (val == 0) {
    $other.show();
  } else {
    $other.hide();
  }
});


/* Convert daily/weekly donations to monthly donations */

function isConvertedToMonthly() {
  return getParam('id') == 19;
}

function getMonthlyValue() {
  var $montlyInfo = jQuery('#monthlyInfo');
  var amount = jQuery('.price-set-row input').filter(':checked').attr('data-amount');
  if (amount) {
    amount = parseFloat(amount);
  } else {
    amount = parseFloat(jQuery('.other_amount-section input').val());
  }
  if (isNaN(amount)) {
    var monthlyValue = '';
  } else {
    var monthlyValue = (amount * 4.3).toFixed(2);
  }
  return monthlyValue;
}

function updateMonthlyValue() {
  var monthlyValue = getMonthlyValue();
  jQuery('#monthlyValue').text(monthlyValue);
}

if (isConvertedToMonthly()) {
  var $monthlyInfo = jQuery('<div class="crm-section"><div class="label"></div><div class="content" id="monthlyInfo">You will contribute € <span id="monthlyValue"></span> per month</div><div class="clear"></div></div>');
  jQuery('.other_amount-section').after($monthlyInfo);
  jQuery('.price-set-row input').on('change', function(e) {
    updateMonthlyValue();
  });
  jQuery('.other_amount-section input').on('keyup', function(e) {
    updateMonthlyValue();
  });
  updateMonthlyValue();

  jQuery('form#Main').on('submit', function(e) {
    jQuery('.other_amount-section input').val(getMonthlyValue());
    jQuery('.price-set-row input[value=0]').prop('checked', 'checked');
  });
}

/* Converting comma to dot in other amount field */
jQuery(".other_amount-content input[name*=price]").change(function(e) {
  jQuery(this).val(jQuery(this).val().replace(/,/g,"."));
});
