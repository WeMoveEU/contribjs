
ContribJS = {
  mandastar: '<span class="crm-marker">*</span>',
  mandastarForBilling: '',

  /* To be agnostic of input name, as it differs with CiviCRM version... */
  paymentProcessorsIds: {
    card: 'CIVICRM_QFID_1_payment_processor_id',
    sepa: 'CIVICRM_QFID_3_payment_processor_id',
    paypal: 'CIVICRM_QFID_5_payment_processor_id'
  },
  testpaymentProcessorsIds: {
    card: 'CIVICRM_QFID_2_payment_processor_id',
    sepa: 'CIVICRM_QFID_4_payment_processor_id',
    paypal: 'CIVICRM_QFID_6_payment_processor_id'
  },
  ppIds: {
    card: 1,
    sepa: 3,
    paypal: 5
  },
  testppIds: {
    card: 2,
    sepa: 4,
    paypal: 6
  },
  paymentProcessors: function($) {
    return $('input[name=payment_processor_id]');
  },
  getPaymentProcessor: function($, paymentName) {
    var $input = $('#'+this.paymentProcessorsIds[paymentName]);
    if ($input.length==0) {
      console.log ("can't find payment provider, switching to test mode");
      this.paymentProcessorsIds = this.testpaymentProcessorsIds;
      $input = $('#'+this.paymentProcessorsIds[paymentName]);
    }
    return $input;
  },
  isProcessorSelected: function($, paymentName) {
    return this.getPaymentProcessor($, paymentName).prop('checked');
  },
  switchPayment: function($, paymentName) {
    this.paymentProcessors($).removeAttr('checked');
    var $input = this.getPaymentProcessor($, paymentName);
    $input.attr('checked', 'checked').click();
    setTimeout(function() { $input.trigger('change.paymentBlock'); }, 100);
  },

  isSingleType: function($, paymentName) {
    $pp = this.paymentProcessors($);
    return $pp.attr('type') == 'hidden' && ($pp.val() == this.ppIds[paymentName] || $pp.val() == this.testppIds[paymentName]);
  },

  setCountry: function($, ctryId) {
    $("#country-1").val(ctryId).change(function(e){$("#select2-chosen-1").text($("#country-1 option:selected").text());}).trigger("change");
    $("#s2id_country-1 a").removeClass("select2-default");
  },

  translate: function($, t) {
    $.each(t.static, function( key, value ) {
      $(key).html(value);
    });
    $.each(t.dynamic, function( key, value ) {
      $(key).html(value);
    });
 
    CRM.$('#billing-payment-block').on('crmLoad', function(e) {
      $.each(t.dynamic, function( key, value ) {
        $(key).html(value);
      });
    });
  },

  setUtmContent: function($, utm_content) {
    if (utm_content == 'NH') { //No Header
      $('.navbar-wrapper').hide();
      $('.main-container').css({"margin-top": "20px"});
    }
    else if (utm_content == 'SH') { //Speakout header
      $('.navbar-wrapper').html($('#speakout-header').remove().html());
    }
  },

  abVariants: {
    'dev': {
      'a': function() { console.info("Activating dev a"); },
      'b': function() { console.info("Activating dev b"); }
    },
    //Random pre-selection of the payment processor
    'preselected-processor': {
      'credit-card':  function() { ContribJS.switchPayment(CRM.$, 'card'); },
      'paypal':       function() { ContribJS.switchPayment(CRM.$, 'paypal'); },
      'direct-debit': function() { ContribJS.switchPayment(CRM.$, 'sepa'); }
    },
    //Force pre-selection of SEPA payment processor
    'default-sepa': {
      'direct-debit': function() { ContribJS.switchPayment(CRM.$, 'sepa'); }
    },
    //Generic variant generator to pick one among several hidden HTML elements, and show it.
    'show-element': function($) {
      var variants = {};
      $('[ab-show-element]').each(function(i, el) {
        var $el = $(el);
        var variant = $el.attr('ab-show-element');
        variants[variant] = function() { $el.show(); };
      });
      return variants;
    },
    //Bigger submit button
    'big-submit': {
      'yes': function() { CRM.$('#crm-submit-buttons').addClass('ab-big-submit'); }
    },
    'utm-content': function($) {
      $ab = $('[ab-test]');
      var contents = $ab.attr('ab-contents').split(',');
      var variants = {};
      $(contents).each(function(i, content) {
        switch(content) {
          case 'NH':
            var testName = 'no-header'; break;
          case 'SH':
            var testName = 'speakout-header'; break;
          default:
            var testName = content;
        }
        variants[testName] = function() { ContribJS.setUtmContent($, content); };
      });
      return variants;
    },
  },

  setUpABTest: function($) {
    $ab = $('[ab-test]');
    if ($ab.length) {
      var testId = $ab.attr('ab-test');
      var experiment = new AlephBet.Experiment({
        name: testId,
        variants: ContribJS.makeABVariants($, testId, $ab.attr('name'), $ab.attr('ab-noop')),
        tracking_adapter: ContribJS.abTracker
      });
      $("fieldset[class*='AB_TESTING']").hide();
    }
  },

  makeABVariants: function($, testId, testName, noop) {
    var variants = ContribJS.abVariants[testId];
    var testName = testName || testId;
    if (typeof variants === 'function') {
      variants = variants($);
    }
    if (noop) {
      variants[noop] = function() {};
    }

    var result = {};
    Object.keys(variants).forEach(function(variant) {
      result[variant] = {
        activate: function() {
          variants[variant]();
          $('input[data-crm-custom="donor_extra_information:ab_testing"]').val(testName);
          $('input[data-crm-custom="donor_extra_information:ab_variant"]').val(variant);
        }
      };
    });
    return result;
  },

  abTracker: {
    _track: function(category, action, label, value) {
      if (typeof ga == 'function') {
        return ga('send', 'event', category, action, label, value);
      }
    },
    experiment_start: function(experiment_name, variant) {
      return this._track(this.namespace, experiment_name, variant + " | views");
    },
    goal_complete: function(experiment_name, variant, event_name) {
      return this._track(this.namespace, experiment_name, variant + " | goal | " + event_name);
    }
  },

  isConvertedToMonthly: function() {
    var weeklyPages = contribConfig.weeklyPages || [];
    return weeklyPages.indexOf(contribConfig.pageId) >= 0;
  },

  isPseudoWeekly: function() {
    var isWeekly = CRM.$('input[name=frequency_unit]').val() == 'week';
    return isWeekly || this.isConvertedToMonthly();
  },

  getMonthlyValue: function() {
    var $montlyInfo = CRM.$('#monthlyInfo');
    var amount = CRM.$('.price-set-row input').filter(':checked').attr('data-amount');
    if (amount) {
      amount = parseFloat(amount);
    } else {
      amount = parseFloat(CRM.$('.other_amount-section input').val());
    }
    if (isNaN(amount)) {
      var monthlyValue = '';
    } else {
      var monthlyValue = (amount * 4.3).toFixed(2);
    }
    return monthlyValue;
  },

  updateMonthlyValue: function() {
    var monthlyValue = ContribJS.getMonthlyValue();
    CRM.$('#monthlyValue').text(monthlyValue);
    CRM.$('#monthlyInput').val(monthlyValue);
  },
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
      if (CRM._.startsWith(classes[c], 'crm-contribution-page-id-')) {
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
  return ContribJS.isConvertedToMonthly();
}
function isPlainMonthly() {
  return isRecurring() && !ContribJS.isConvertedToMonthly();
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
  if (CRM._.endsWith(lang, '/')) {
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
  var isPaypal = ContribJS.isSingleType($, 'paypal') || ContribJS.isProcessorSelected($, 'paypal');
  $('#crm-main-content-wrapper').toggleClass('paypal', isPaypal);
  if (isPaypal) {
    $('#crm-submit-buttons').hide();
    //Bug in AJAX call to generate paypal section: the button name does not match the form name
    //This prevents Civi from recognizing an express payment
    $('#_qf_Payment_upload_express').attr('name', '_qf_Main_upload_express');
  }
}

function prettifyPaymentSelector($) {
  //replace the radio buttons by real buttons
  $('.payment_processor-section .content input').hide();
  $('.payment_processor-section .content label').wrap("<a class='btn btn-lg btn-primary'></a>");
  $("label[for="+ContribJS.paymentProcessorsIds.card+"]").prepend('<span class="glyphicon glyphicon-credit-card">&nbsp;</span>');
  $("label[for="+ContribJS.paymentProcessorsIds.sepa+"]").prepend('<span class="badge" title="SEPA">S&euro;PA</span>&nbsp;');
  ContribJS.paymentProcessors($).change(function(){
    $('.payment_processor-section .content a.btn').removeClass('btn-info').addClass('btn-primary');
    $("label[for='"+$(this).attr('id')+"']").parent().removeClass('btn-primary').addClass("btn-info");
  });
  //Using :checked filter would work if the CRM was not tampering with it on load
  //Filtering on attribute works around this
  $checked = ContribJS.paymentProcessors($).filter(":checked");
  if (!$checked.length) {
    $checked = ContribJS.paymentProcessors($).filter("[checked=checked]");
  }
  $("label[for='"+$checked.attr('id')+"']").parent().addClass("btn-info").removeClass('btn-primary');
}

