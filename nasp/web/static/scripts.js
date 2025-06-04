BASE_URL = "http://localhost:5000"
function allocNSI(nst) {
  alert("Test")
  console.log(nst)
  alert("Creating a New Slice...")
  // request("PUT", "http://165.232.128.22:5000/nasp/nsi", JSON.stringify(nst))
  // var settings = {
  //     "url": "http://localhost:5000/nasp/allocNsi",
  //     "method": "PUT",
  //     "timeout": 0,
  //     "headers": {
  //       "Content-Type": "application/json"
  //     },
  //     "data": JSON.stringify({
  //       "NstTemplateId": String(id)
  //   }),
  //   };
    
  //   $.ajax(settings).done(function (response) {
  //     console.log(response);
  //     window.location.href = '/';
  //   });
  // return ""
}
$('#myModal').on('shown.bs.modal', function () {
  alert("Testing")
  $('#myInput').trigger('focus')
})

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
    window.location.href = 'nsst';
  });
}

function createNSST(form) {
  let formData = new FormData(form);
  var object = {};
  formData.forEach((value, key) => object[key] = value);
  var json = JSON.stringify(object);
  console.log(object)
  if (object.domain == "RAN") {
    URI = "/nssmfRAN/nsst"
  }
  if (object.domain == "Core") {
    URI = "/nssmfCore/nsst"
  }

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
    window.location.href = 'nsst';
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
  
  var json = JSON.stringify(object);
  var data = JSON.parse(json)
  data.description = JSON.parse(data.description)
  console.log(data)
  console.log(JSON.stringify(data))
  request("PUT", "http://127.0.0.1:5000/nasp/nsi", JSON.stringify(data))
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