
function getParam(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}


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
  jQuery('#monthlyInput').val(monthlyValue);
}



/* IBAN magic */

function isIBANConverted(formId) {
  var ibanMagicPages = contribConfig.ibanMagicPages || [];
  return ibanMagicPages.indexOf(formId) >= 0;
}


var field_tpl = '<div class="crm-section @@name@@-section national-transfer" style="display: none"><div class="label"><label for="@@name@@">@@label@@</label><span class="crm-marker" title="This field is required.">*</span></div><div class="content"><input size="34" maxlength="34" autocomplete="off" name="@@name@@" id="@@name@@" class="crm-form-text" type="text"> <img style="display: none;" id="bic_busy" src="/sites/all/modules/civicrm/i/loading.gif" height="12"></div><div class="clear"></div></div>'

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
  for (field_id in contribConfig.nationalFields[country]) {
    var value = jQuery('#' + field_id).val().split(' ').join('');
    if (country === 'DE' && field_id === 'account') {
      bban += ('0000000000' + value).slice(-10);
    } else {
      bban += value;
    }
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

var switchHtml = null;
function enableNationalForm(country) {
  //First call, we move the field created by custom profile and save the HTML
  //next calls we re-use the saved HTML
  if (switchHtml === null) {
    $switch_section = jQuery('input[value=SEPA]').parent().parent();
    jQuery('label[for=CIVICRM_QFID_SEPA_2]', $switch_section).html(contribConfig.translations['SEPA_transfer']);
    jQuery('label[for=CIVICRM_QFID_National_4]', $switch_section).html(contribConfig.translations['National_transfer']);
    switchHtml = $switch_section[0].outerHTML;
  } else {
    $switch_section = jQuery(switchHtml);
  }

  if (contribConfig.nationalFields[country]) {
    $switch_section.remove();
    jQuery('.label, .crm-clear-link', $switch_section).hide();
    jQuery('.account_holder-section').before($switch_section);
    $switch_section.show();
    addNationalForm(country);
  }
}

function addNationalForm(country) {
  var fieldSelect = [];
  for (field_id in contribConfig.nationalFields[country]) {
    addField(field_id, contribConfig.nationalFields[country][field_id]);
    fieldSelect.push('.' + field_id + '-section');
  }
  fieldSelect = fieldSelect.join(', ');
  if (jQuery('input[value=National]').is(':checked')) {
    jQuery(fieldSelect).show();
  }

  var $iban = jQuery('#bank_account_number');
  jQuery('input[value=National], input[value=SEPA]').on('change', function (e) {
    jQuery(fieldSelect + ', .bank_account_number-section, .bank_identification_number-section').toggle();
    $iban.click();
    if (jQuery('input[value=National]').is(':checked')) {
      ga('send', 'event', 'SEPA', 'national_account', country);
    } else {
      ga('send', 'event', 'SEPA', 'IBAN_account', country);
    }
  });

  jQuery(fieldSelect).on('keyup', function(e) {
    $iban.val(genIBAN(country));
    $iban.trigger('click');
  });
}

function updateNationalForm(country) {
  jQuery('.national-transfer input').off('change');
  jQuery('.national-transfer').remove();
  jQuery('input[value=National]').off('change');

  addNationalForm(country);
}

function readCountry(contribConfig) {
  var country = contribConfig.countries[jQuery('#country-1').val()];
  if (!country) country = contribConfig.language;
  return country;
}

function copyFrozenFields() {
  jQuery('.crm-frozen-field').each(function() {
    var $span = jQuery(this);
    var $input = jQuery('input', $span);
    var id = '#billing_' + $input.attr('id');
    $input.val($span.text());
    jQuery(id).val($span.text());
  });
}

jQuery(function($) {
  // Set earlier in a drupal block
  var contribConfig = window.contribConfig || {};

  // set default amount based on param donation_amount in url
  var name = 'donation_amount';
  var da = getParam(name);
  if (da > 0) {
    var total = da.replace(/[^\/\d]/g,'');
    da = da.replace('.', '\\.');
    var $elem = jQuery(".price-set-row input[data-amount="+da+"]").prop("checked", true).click();
    setTimeout(function () {
      currentTotal = total;
    }, 100);
  }

  //Show / hide other amount input
  var $other = jQuery('.crm-container .crm-section.other_amount-section');
  if (jQuery('.price-set-row input[value=0]').is(':checked')) {
    $other.show();
  }
  jQuery('.price-set-row input').on('change', function(e) {
    var val = jQuery(this).val();
    if (val == 0) {
      $other.show();
    } else {
      $other.hide();
    }
  });
  // Use phone friendly field types
  jQuery('#email-5').attr('type', 'email');
  jQuery('#credit_card_number').attr('type', 'tel');
  jQuery('#cvv2').attr('type', 'tel');

  if (isConvertedToMonthly()) {
    var $monthlyInfo = jQuery(
        '<div class="crm-section">'
      +  '<div class="label"></div>'
      +  '<div class="content" id="monthlyInfo">' + contribConfig.translations['monthlyInfo'] + '</div>'
      +  '<div class="clear"></div>'
      + '</div>'
    );
    var $monthlyOther = jQuery('.price-set-row input[value=0]').clone();
    var $monthlyInput = jQuery('.other_amount-section input').clone();
    var priceSetName = jQuery('.price-set-row input').attr('name');
    jQuery('.price-set-row input').attr('name', priceSetName + '__');
    jQuery('.other_amount-section input').attr('name', priceSetName + '_other');
    jQuery('.other_amount-section').after($monthlyInfo);
    $monthlyOther.prop('checked', 'checked').prop('id', 'monthlyOther').hide();
    $monthlyInput.prop('id', 'monthlyInput').hide(); 
    $monthlyInfo.after($monthlyInput);
    $monthlyInfo.after($monthlyOther);

    jQuery('.price-set-row input').on('change', function(e) {
      updateMonthlyValue();
    });
    jQuery('.other_amount-section input').on('keyup', function(e) {
      updateMonthlyValue();
    });
    updateMonthlyValue();
  }

  /* Converting comma to dot in other amount field */
  jQuery(".other_amount-content input[name*=price]").change(function(e) {
    jQuery(this).val(jQuery(this).val().replace(/,/g,"."));
  });

  /* Hide CC fields for paypal */
  var $payProc = jQuery('input[name=payment_processor]');
  var toHide = [
    ".credit_card_info-section", 
    "#billingcheckbox", 
    "label[for=billingcheckbox]", 
    ".billing_name_address-group",
    "#crm-submit-buttons"
  ];
  if ($payProc.filter(':checked').val() == '5') {
    jQuery(toHide.join(', ')).hide();
  }
  $payProc.on('change', function(e) {
    if ($payProc.filter(':checked').val() == '5') {
      jQuery(toHide.join(', ')).hide();
    }
  });

  /* Set up IBAN magic */
  if (isIBANConverted(contribConfig.pageId)) {
    jQuery('input[value=SEPA]').parent().parent().hide();
    if (jQuery('.direct_debit_info-group').length) {
      var country = readCountry(contribConfig);
      enableNationalForm(country);
    }
    $payProc.on('change', function(e) {
      if ($payProc.filter(':checked').val() == '3') {
      	var country = readCountry(contribConfig);
      	enableNationalForm(country);
      }
    });
    CRM.$(function($) {
      $('#country-1').on('change', function(e) {
      	if ($payProc.filter(':checked').val() == '3') {
      	  var country = readCountry(contribConfig);
      	  updateNationalForm(country);
      	}
      });
    });
  }

  /* Pre-fill first name, last name and email */
  var fields = {
    1 : "first_name",
    2 : "last_name",
    3 : "email"
  };
  jQuery.each(fields, function(k, f) {
    var el = jQuery("input[name*="+f+"]");
    if (!el.val()) {
      el.val(getParam(f));
    }
  });
  /* pre-fill billing with frozen fields */
  copyFrozenFields();

});
