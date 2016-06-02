// Set by earlier in a drupal block
var contribConfig = window.contribConfig || {};

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
  var weeklyPages = contribConfig.weeklyPages || [];
  return weeklyPages.indexOf(contribConfig.pageId) >= 0;
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


/* IBAN magic */

var natFields = {
  ES: {
    'bank_code': "Bank code",
    'branch_code': "Branch code",
    'check_digits': "Check digits",
    'account': "Account number"
  },
  DE: {
    'bank_code': "Bank code",
    'account': "Account number"
  }
}

function isIBANConverted(formId) {
  var ibanMagicPages = contribConfig.ibanMagicPages || [];
  return ibanMagicPages.indexOf(formId) >= 0;
}

var switch_section = '<div class="crm-section transfer_scheme-section"> <div class="content"> <input id="SEPA_scheme" name="transfer_scheme" value="SEPA" type="radio" checked> <label for="SEPA_scheme">SEPA</label> <input id="National_scheme" name="transfer_scheme" value="national" type="radio"> <label for="National_scheme">National</label> </div> <div class="clear"></div> </div>';

var field_tpl = '<div class="crm-section @@name@@-section" style="display: none"><div class="label"><label for="@@name@@">@@label@@</label><span class="crm-marker" title="This field is required.">*</span></div><div class="content"><input size="34" maxlength="34" autocomplete="off" name="@@name@@" id="@@name@@" class="crm-form-text" type="text"> <img style="display: none;" id="bic_busy" src="/sites/all/modules/civicrm/i/loading.gif" height="12"></div><div class="clear"></div></div>'

function addField(name, label) {
  var $iban = jQuery('.bank_account_number-section');
  var field = field_tpl.split('@@name@@').join(name);
  field = field.replace('@@label@@', label);
  $iban.before(field);
}

function replaceLetters(bban) {
  var value = '';
  var a = 'a'.charCodeAt(0) - 10;
  bban = bban.toLowerCase();
  for (var i = 0; i < bban.length; ++i) {
    var c = bban.charAt(i);
    var n = parseInt(c);
    if (isNaN(n)) n = bban.charCodeAt(i) - a;
    value = value + n;
  }
  return value;
}

function mod97(digits) {
  var value = 0;
  for (var i = 0; i < digits.length; ++i) {
    value = (10 * value + parseInt(digits.charAt(i))) % 97;
  }
  return value;
}

function getBBAN(country) {
  var bban = '';
  for (field_id in natFields[country]) {
    bban += jQuery('#' + field_id).val();
  }
  return bban;
}

function genIBAN(country) {
  var bban = getBBAN(country);
  var checkInput = replaceLetters(bban + country + '00');
  var checksum = (98 - mod97(checkInput)).toString();
  while (checksum.length < 2) checksum = '0' + checksum;
  return country + checksum + bban;
}

function enableNationalForm(country) {
  jQuery('.account_holder-section').before(switch_section);
  var fieldSelect = '';
  for (field_id in natFields[country]) {
    addField(field_id, natFields[country][field_id]);
    fieldSelect += '.' + field_id + '-section, ';
  }

  var $iban = jQuery('#bank_account_number');
  jQuery('input[name=transfer_scheme]').on('change', function (e) {
    jQuery(fieldSelect + '.bank_account_number-section, .bank_identification_number-section').toggle();
    $iban.click();
  });

  jQuery('#bank_code, #branch_code, #check_digits, #account').on('change', function(e) {
    $iban.val(genIBAN(country));
  });
}

if (isIBANConverted(contribConfig.pageId)) {
  var country = 'DE';
  var $payProc = jQuery('input[name=payment_processor]');
  if (jQuery('.direct_debit_info-group').length) {
    enableNationalForm(country);
  }
  $payProc.on('change', function(e) {
    if ($payProc.filter(':checked').val() == '3') {
      enableNationalForm(country);
    }
  });
}

