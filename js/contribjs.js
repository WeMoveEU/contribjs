// set default amount based on param donation_amount in url
var name = 'donation_amount';
var da = decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
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
  return true;
}

function toggleMonthlyPayment() {
  var freq = jQuery('#frequency_unit').val();
  var $montlyInfo = jQuery('#monthlyInfo');
  if (freq === 'day' || freq === 'week') {
    var amount = jQuery('.price-set-row input').filter(':checked').attr('data-amount');
    if (amount) {
      amount = parseFloat(amount);
    } else {
      amount = parseFloat(jQuery('.other_amount-section input').val());
    }
    if (freq === 'day') {
      var monthlyValue = amount * 30;
    } else {
      var monthlyValue = amount * 4;
    }
    jQuery('#monthlyValue').text(monthlyValue);
    $monthlyInfo.show();
  } else {
    $monthlyInfo.hide();
  }
}

if (isConvertedToMonthly()) {
  var $monthlyInfo = jQuery('<span id="monthlyInfo">Per month: <span id="monthlyValue"></span></span>');
  jQuery('#recurHelp').append($monthlyInfo);
  jQuery('.price-set-row input, .other_amount-section input, #frequency_unit').on('change', function(e) {
    toggleMonthlyPayment();
  });
  toggleMonthlyPayment();
}

