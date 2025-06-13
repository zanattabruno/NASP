/**
 * Legacy scripts - to be migrated to modular structure
 * @deprecated Use the new modular JS files instead
 */

// Configuration - use CONFIG from base.js instead
const BASE_URL = "http://localhost:5000";

/**
 * Allocate NSI - Legacy function
 * @deprecated Use NSI.createInstance() instead
 */
function allocNSI(nst) {
  console.log("Legacy allocNSI called with:", nst);
  alert("Creating a New Slice...");
  // Implementation moved to nsi.js
}
/**
 * Modal event handler - Legacy
 * @deprecated Move to appropriate module
 */
$('#myModal').on('shown.bs.modal', function () {
  console.log("Modal shown - legacy handler");
  $('#myInput').trigger('focus');
});

function addAMF_temp(form){
  let formData = new FormData(form);
  var object = {};
  console.log(formData)
  formData.forEach((value, key) => object[key] = value);
  var json = JSON.stringify(object);

  var settings = {
    "url": "http://127.0.0.1:5000/nssmfCore/nsst",
    "method": "PUT",
    "timeout": 0,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": json,
  };
  console.log(settings)

  $.ajax(settings).done(function (response) {
    console.log(response);
    window.location.href = '/';
  });
}

function createNST(form) {
  URI = "/nasp/nst"
  let formData = new FormData(form);
  var object = {};
  formData.forEach((value, key) => object[key] = value);
  var json = JSON.stringify(object);
  var settings = {
    "url": BASE_URL+URI,
    "method": "PUT",
    "timeout": 0,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": json,
  };
  console.log(settings)

  $.ajax(settings).done(function (response) {
    console.log(response);
    window.location.href = '/';
  });
}

// IMSI Range Validation and Processing Functions
function validateIMSIRange(imsiRange) {
  // Check for hyphen-separated format
  if (!imsiRange.includes('-')) {
    return false;
  }
  
  var parts = imsiRange.split('-');
  if (parts.length !== 2) {
    return false;
  }
  
  var start = parts[0].trim();
  var end = parts[1].trim();
  
  // IMSI should be 15 digits
  var imsiRegex = /^[0-9]{15}$/;
  if (!imsiRegex.test(start) || !imsiRegex.test(end)) {
    return false;
  }
  
  // Start should be less than end
  if (parseInt(start) >= parseInt(end)) {
    return false;
  }
  
  return true;
}

function parseIMSIRange(imsiRange) {
  var parts = imsiRange.split('-');
  var start = parts[0].trim();
  var end = parts[1].trim();
  var count = parseInt(end) - parseInt(start) + 1;
  
  return {
    start: start,
    end: end,
    count: count,
    range: imsiRange
  };
}

function createSliceGSMA(form) {
  let formData = new FormData(form)
  var object = {};
  formData.forEach((value, key) => object[key] = value);
  
  // IMSI Range validation and processing
  if (object.imsi_range) {
    if (!validateIMSIRange(object.imsi_range)) {
      alert("Invalid IMSI range format. Please use format: START-END (e.g., 208950000000001-208950000000010)");
      return;
    }
    // Parse IMSI range
    var imsiData = parseIMSIRange(object.imsi_range);
    object.imsi_start = imsiData.start;
    object.imsi_end = imsiData.end;
    object.imsi_count = imsiData.count;
    console.log("IMSI Range processed:", imsiData);
  }

  // Authentication Keys Processing
  if (object.auth_method) {
    switch (object.auth_method) {
      case 'shared':
        if (object.shared_k && !validateHexKey(object.shared_k)) {
          alert("Invalid K key format. Must be 32 hexadecimal characters.");
          return;
        }
        if (object.shared_opc && !validateHexKey(object.shared_opc)) {
          alert("Invalid OPc key format. Must be 32 hexadecimal characters.");
          return;
        }
        object.auth_config = {
          method: 'shared',
          k: object.shared_k || null,
          opc: object.shared_opc || null
        };
        break;
      case 'pattern':
        if (object.base_k && !validateHexKey(object.base_k)) {
          alert("Invalid base K key format. Must be 32 hexadecimal characters.");
          return;
        }
        if (object.base_opc && !validateHexKey(object.base_opc)) {
          alert("Invalid base OPc key format. Must be 32 hexadecimal characters.");
          return;
        }
        object.auth_config = {
          method: 'pattern',
          pattern: object.key_pattern,
          base_k: object.base_k || null,
          base_opc: object.base_opc || null
        };
        break;
      default:
        object.auth_config = {
          method: 'auto'
        };
    }
    console.log("Authentication config:", object.auth_config);
  }
  
  var json = JSON.stringify(object);
  var data = JSON.parse(json)
  data.description = JSON.parse(data.description)
  console.log(data)
  console.log(JSON.stringify(data))
  request("PUT", "http://127.0.0.1:5000/nasp/nsi", JSON.stringify(data))
}

// Validation function for hexadecimal keys
function validateHexKey(key) {
  if (!key) return false;
  return /^[0-9A-Fa-f]{32}$/.test(key);
}

function request(method,url,data) {
  var settings = {
    "url": url,
    "method": method,
    "timeout": 0,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": data,
  };
  console.log(settings)

  $.ajax(settings).done(function (response) {
    console.log(response);
    window.location.href = '/';
  });
}