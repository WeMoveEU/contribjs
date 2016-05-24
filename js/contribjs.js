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


/* IBAN magic */

function isIBANConverted(formId) {
  var toConvert = ['11', '14', '18'];
  return toConvert.indexOf(formId) >= 0;
}

var field_tpl = '<div class="crm-section @@name@@-section"><div class="label"><label for="@@name@@">@@label@@</label><span class="crm-marker" title="This field is required.">*</span></div><div class="content"><input size="34" maxlength="34" autocomplete="off" name="@@name@@" id="@@name@@" class="crm-form-text" type="text"> <img style="display: none;" id="bic_busy" src="/sites/all/modules/civicrm/i/loading.gif" height="12"></div><div class="clear"></div></div>'

function addField(name, label) {
  var $iban = jQuery('.bank_account_number-section');
  var field = field_tpl.split('@@name@@').join(name);
  field = field.replace('@@label@@', label);
  $iban.before(field);
}

var formId = getParam('id');
if (isIBANConverted(formId)) {
  var $iban = jQuery('#bank_account_number');
  addField('bank_code', "Bank code");
  addField('branch_code', "Branch code");
  addField('check_digits', "Check digits");
  addField('account', "Account number");
  jQuery('#bank_code, #branch_code, #check_digits, #account').on('change', function(e) {
    $iban.val("Hello");
  });
}

