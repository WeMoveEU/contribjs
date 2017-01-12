
ContribJS = {
  mandastar: '<span class="crm-marker">*</span>',
  mandastarForBilling: '<span class="crm-marker">*</span>',
};

function getParam(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

/**
 * The page id could be read from GET param, but this is safer
 * in case a alias URL is used
 */
function readPageId() {
  var $mainBlock = jQuery('.crm-contribution-main-form-block');
  if ($mainBlock.length) {
    var classes = $mainBlock.attr('class').split(' ');
    for (var c=0; c<classes.length; c++) {
      if (classes[c].startsWith('crm-contribution-page-id-')) {
	return parseInt(classes[c].substr(25));
      }
    }
  }
  return undefined;
}

/* Convert weekly donations to monthly donations */
function isRecurring() {
  return jQuery('#is_recur').length > 0;
}
function isConvertedToMonthly() {
  var weeklyPages = contribConfig.weeklyPages || [];
  return weeklyPages.indexOf(contribConfig.pageId) >= 0;
}
function isPlainMonthly() {
  return isRecurring() && !isConvertedToMonthly();
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

/**
 * Checks whether the radio button to switch account format is present.
 * (it is added with custom profile)
 */
function isIBANConverted(formId) {
  return jQuery('input[value=SEPA]').length > 0;
}


var field_tpl = '<div class="crm-section @@name@@-section national-transfer" style="display: none"><div class="label"><label for="@@name@@">@@label@@</label> <span class="crm-marker" title="This field is required.">*</span></div><div class="content"><input size="34" maxlength="34" autocomplete="off" name="@@name@@" id="@@name@@" class="crm-form-text" type="text"> <img style="display: none;" id="bic_busy" src="/sites/all/modules/civicrm/i/loading.gif" height="12"></div><div class="clear"></div></div>'

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
    if (window.ga) {
      if (jQuery('input[value=National]').is(':checked')) {
        ga('send', 'event', 'SEPA', 'national_account', country);
      } else {
        ga('send', 'event', 'SEPA', 'IBAN_account', country);
      }
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

function readLanguage() {
  var lang = location.pathname.substr(1, 3);
  if (lang.endsWith('/')) {
    lang = lang.substr(0, 2);
  } else {
    lang = 'gb';
  }
  return lang;
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

function hideForPaypal($) {
  var toHide = [
    ".credit_card_info-section", 
    "#billingcheckbox", 
    "label[for=billingcheckbox]", 
    ".billing_name_address-group",
    "#crm-submit-buttons"
  ];
  var $payProc = $('input[name=payment_processor]');
  if ($payProc.filter(':checked').val() == '5') {
    setTimeout(function() {
      $(toHide.join(', ')).hide();
    }, 100);
  }
}

function prettifyPaymentSelector($) {
  //replace the radio buttons by real buttons
  $('.payment_processor-section .content input').hide();
  $('.payment_processor-section .content label').wrap("<a class='btn btn-lg btn-primary'></a>");
  $("label[for='CIVICRM_QFID_1_payment_processor']").prepend('<span class="glyphicon glyphicon-credit-card">&nbsp;</span>');
  $("label[for='CIVICRM_QFID_3_payment_processor']").prepend('<span class="badge" title="SEPA">S&euro;PA</span>&nbsp;');
  $("input[name='payment_processor']").change(function(){
    $('.payment_processor-section .content a.btn').removeClass('btn-info').addClass('btn-primary');
    $("label[for='"+$(this).attr('id')+"']").parent().removeClass('btn-primary').addClass("btn-info");
  });
  $("label[for='"+$("input[name='payment_processor']:checked").prop('id')+"']").parent().addClass("btn-info").removeClass('btn-primary');
}

jQuery(function($) {
  // Set earlier in a drupal block
  var contribConfig = window.contribConfig || {};

  prettifyPaymentSelector($);
  // set default amount based on param donation_amount in url
  var name = 'donation_amount';
  var da = getParam(name);
  if (da > 0) {
    var total = da.replace(/[^\/\d]/g,'');
    da = parseInt(da);
    var $elem = jQuery(".price-set-row input[data-amount]").filter(function (i, e) {
      var amount = parseInt($(e).attr('data-amount'));
      return amount == da;
    }).prop("checked", true).click();
    //Dirty trick to make sure this happens after CiviCRM stuff
    //currentTotal is a global variable used by Civi
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
  //Hide everything other than amount until one is selected
// Not for now, we need to find a way to show a next button, or something
//  if ($('.price-set-row input').filter(':checked').length == 0) {
//    CRM.$(function($) {
//      setTimeout(function () { //Counter-hack Civi mess
//	$('.crm-group, #billing-payment-block, .email-5-section, .crm-submit-buttons, #footer_text').hide();
//      }, 100);
//    });
//    $('.price-set-row input').on('change', function(e) {
//      $('.crm-group, #billing-payment-block, .email-5-section, .crm-submit-buttons, #footer_text').show();
//    });
//  }

  // Pages are either one-off-only or recurring-only
  // When recurring is enabled, select it and hide it
  jQuery("#is_recur").attr("checked","checked");
  jQuery(".is_recur-section").hide();
  // Change the submit icon for a "secure" lock
  $('.crm-submit-buttons .glyphicon').removeClass('glyphicon-ok').addClass('glyphicon-lock');

  // Use phone friendly field types
  jQuery('#email-5').attr('type', 'email');
  jQuery('#credit_card_number').attr('type', 'tel');
  jQuery('#cvv2').attr('type', 'tel');

  //Variations
  var utm_content = getParam('utm_content');
  if (utm_content == 'NH') { //No Header
    $('.navbar-wrapper').hide();
    $('.main-container').css({"margin-top": "20px"});
  }
  else if (utm_content == 'SH') { //Speakout header
    $('.navbar-wrapper').html($('#speakout-header').remove().html());
  }

  //Avoid stripe mixing up with other payment processors
  jQuery('form#Main').after('<input type="hidden" id="stripe-id" value="1" />');

  // Black magic to display a monthly donation as a weekly one
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
    if (jQuery('.crm-error').length) {
      var amount = parseFloat (jQuery(".other_amount-content input[name*=price]").val());
      var monthlyValue = (amount / 4.3).toFixed(2);
      jQuery('.other_amount-content input[name*=price]').val(monthlyValue);
    }
    updateMonthlyValue();
  }

  /* Converting comma to dot in other amount field */
  jQuery(".other_amount-content input[name*=price]").change(function(e) {
    jQuery(this).val(jQuery(this).val().replace(/,/g,"."));
  });


  /* Hide CC fields for paypal */
  var $payProc = CRM.$('input[name=payment_processor]');
  hideForPaypal(CRM.$);
  $payProc.on('change', function(e) {
    hideForPaypal(CRM.$);
  });
  // For when the payment option is shown after picking an amount
  $('.price-set-row input').on('change', function() {
    hideForPaypal(CRM.$);
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
        setTimeout(function() {
          var country = readCountry(contribConfig);
          enableNationalForm(country);
        }, 100);
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
  /* pre-fill billing when main fields are changed */
  // This is done by Civi, but not reset when the user changes the payment processor
  $payProc.on('change', function() {
    if ($payProc.filter(':checked').val() == '1') {
      $.each(fields, function(k, f) {
        $('#'+f).on('change', function() {
          $('#billing_'+f).val(this.value);
        });
      });
      setTimeout(function() {
	$.each(fields, function(k, f) {
	  $('#'+f).change();
	});
      }, 100);
    }
  });

});
