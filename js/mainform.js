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

  ContribJS.setUpABTest($);

  // Pages are either one-off-only or recurring-only
  // When recurring is enabled, select it and hide it
  jQuery("#is_recur").attr("checked","checked");
  jQuery(".is_recur-section").hide();
  // Change the submit icon for a bigger button with a "secure" lock
  $('.crm-submit-buttons > span').removeClass('crm-button crm-i-button').addClass('btn btn-lg btn-primary xavcrm-button crm-icon-button');
  $('.crm-submit-buttons .fa-check').removeClass('fa-check').addClass('fa-lock');

  // Use phone friendly field types
  jQuery('#email-5').attr('type', 'email');
  jQuery('#credit_card_number').attr('type', 'tel');
  jQuery('#cvv2').attr('type', 'tel');

  //Variations
  var utm_content = getParam('utm_content');
  ContribJS.setUtmContent($, utm_content);

  //Avoid stripe mixing up with other payment processors
  jQuery('form#Main').after('<input type="hidden" id="stripe-id" value="1" />');

  // Black magic to display a monthly donation as a weekly one
  if (ContribJS.isPseudoWeekly()) {
    var $monthlyInfo = $(
        '<div class="crm-section">'
      +  '<div class="label"></div>'
      +  '<div class="content" id="monthlyInfo">' + contribConfig.translations['monthlyInfo'] + '</div>'
      +  '<div class="clear"></div>'
      + '</div>'
    );
    $('.other_amount-section').after($monthlyInfo);

    if (ContribJS.isConvertedToMonthly()) {
      var $monthlyOther = $('.price-set-row input[value=0]').clone();
      var $monthlyInput = $('.other_amount-section input').clone();
      var priceSetName = $('.price-set-row input').attr('name');
      $('.price-set-row input').attr('name', priceSetName + '__');
      $('.other_amount-section input').attr('name', priceSetName + '_other');
      $monthlyOther.prop('checked', 'checked').prop('id', 'monthlyOther').hide();
      $monthlyInput.prop('id', 'monthlyInput').hide(); 
      $monthlyInfo.after($monthlyInput);
      $monthlyInfo.after($monthlyOther);

      if ($('.crm-error').length) {
        var amount = parseFloat (jQuery(".other_amount-content input[name*=price]").val());
        var monthlyValue = (amount / 4.3).toFixed(2);
        $('.other_amount-content input[name*=price]').val(monthlyValue);
      }
    }

    $('.price-set-row input').on('change', ContribJS.updateMonthlyValue);
    $('.other_amount-section input').on('keyup', ContribJS.updateMonthlyValue);
    ContribJS.updateMonthlyValue();
  }

  /* Converting comma to dot in other amount field */
  jQuery(".other_amount-content input[name*=price]").change(function(e) {
    jQuery(this).val(jQuery(this).val().replace(/,/g,"."));
  });

  /* Hide CC fields for paypal */
  CRM.$('#billing-payment-block').on('crmLoad', function(e) {
    hideForPaypal(CRM.$);
  });
  // For when the payment option is shown after picking an amount
  $('.price-set-row input, .other_amount-section input').on('change', function() {
    //The amount of shit we have to do to work around Civi's shit is insane
    if (!ContribJS.paymentProcessors($).filter(":checked").length) {
      ContribJS.paymentProcessors($).filter("[checked=checked]").prop('checked', true);
    }
    hideForPaypal(CRM.$);
  });

  /* Set up IBAN magic */
  var $payProc = ContribJS.paymentProcessors($);
  if (isIBANConverted(contribConfig.pageId)) {
    jQuery('input[value=SEPA]').parent().parent().hide();
    if (jQuery('.direct_debit_info-group').length) {
      var country = readCountry(contribConfig);
      enableNationalForm(country);
    }
    CRM.$('#billing-payment-block').on('crmLoad', function(e) {
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
  /* pre-fill billing when main fields are changed */
  // This is done by Civi, but not reset when the user changes the payment processor
  CRM.$('#billing-payment-block').on('crmLoad', function(e) {
    if ($payProc.filter(':checked').val() == '1') {
      $.each(fields, function(k, f) {
        $('#'+f).on('change', function() {
          $('#billing_'+f).val(this.value);
        }).change();
      });
    }
  });

  $(".crm-form-submit").click(function(){
    // in some cases, the payment processor is selected, but the radio button isn't. No idea
    if (!ContribJS.paymentProcessors($).filter(":checked").length) {
      ContribJS.paymentProcessors($).filter("[checked=checked]").prop('checked', true);
    }
  });


});
