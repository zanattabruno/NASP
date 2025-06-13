/**
 * Essential scripts for NASP functionality
 */

// Configuration - dynamically get the base URL to avoid CORS issues
const BASE_URL = window.location.origin;

// IMSI Range Validation and Processing Functions
function validateIMSIRange(imsiRange) {
  const pattern = /^\d{15}-\d{15}$/;
  if (!pattern.test(imsiRange)) {
    return false;
  }
  
  const [start, end] = imsiRange.split('-').map(Number);
  return start < end;
}

function parseIMSIRange(imsiRange) {
  if (!validateIMSIRange(imsiRange)) {
    throw new Error('Invalid IMSI range format');
  }
  
  const [start, end] = imsiRange.split('-');
  const count = parseInt(end) - parseInt(start) + 1;
  
  return {
    start: start,
    end: end,
    count: count,
    range: imsiRange
  };
}

// Validation function for hexadecimal keys
function validateHexKey(key) {
  return /^[0-9A-Fa-f]+$/.test(key) && key.length === 32;
}

// Essential HTTP request function
function request(method, url, data) {
  var settings = {
    "url": url,
    "method": method,
    "timeout": 8000,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": data,
  };

  return $.ajax(settings)
    .done(function (response) {
      console.log("Request successful:", response);
      return response;
    })
    .fail(function (xhr, status, error) {
      console.error("Request failed:", status, error);
      return xhr;
    });
}

// Legacy NST creation function - kept for backward compatibility
function createNST(form) {
  const URI = "/nasp/nst";
  let formData = new FormData(form);
  var object = {};
  formData.forEach((value, key) => object[key] = value);
  var json = JSON.stringify(object);
  
  var settings = {
    "url": BASE_URL + URI,
    "method": "PUT",
    "timeout": 8000,
    "headers": {
      "Content-Type": "application/json"
    },
    "data": json,
  };

  $.ajax(settings).done(function (response) {
    console.log("NST created:", response);
    window.location.href = '/';
  }).fail(function(xhr, status, error) {
    console.error("NST creation failed:", error);
    alert("Failed to create template. Please try again.");
  });
}

// Essential slice creation function
function createSliceGSMA(form) {
  let formData = new FormData(form);
  var object = {};
  formData.forEach((value, key) => object[key] = value);
  
  // IMSI Range validation and processing
  if (object.imsi_range) {
    if (!validateIMSIRange(object.imsi_range)) {
      alert("Invalid IMSI range format. Please use format: START-END (e.g., 208950000000001-208950000000010)");
      return;
    }
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
  var data = JSON.parse(json);
  data.description = JSON.parse(data.description);
  console.log("Deploying slice:", data);
  
  request("PUT", BASE_URL + "/nasp/nsi", JSON.stringify(data))
    .done(function(response) {
      alert("Slice deployment initiated successfully!");
      window.location.href = '/nsi';
    })
    .fail(function(xhr, status, error) {
      console.error("Deployment failed:", xhr, status, error);
      let errorMessage = "Deployment failed. ";
      if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage += xhr.responseJSON.message;
      } else if (xhr.responseText) {
        errorMessage += xhr.responseText;
      } else {
        errorMessage += "Please check the console for more details.";
      }
      alert(errorMessage);
    });
}