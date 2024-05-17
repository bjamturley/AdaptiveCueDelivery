// TODO:
// Disable run button if no. tones <= 0 or error is thrown
// Some reported issues with download button
// Refresh server as needed

latestTeleID = "-1"
queryCount = 0
$(document).ready(function() {
	log("ACD Experiment Manager started")
	navigator.mediaDevices.getUserMedia({audio: true})
	.then(function(stream) {
		log("Audio stream OK")
	})
	.catch(function(error) {
		log("Audio stream error of type " + error, "error")
	})
	updateParameters()
	// Determine mediaDevice compatability
	if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
		log("enumerateDevices() not supported", type="warning")
	}
	readAudioSources()
	runTestData()
})
audioDevices = []
activeAudioDevices = []
mouseVitals = []
function readAudioSources() {
	activeAudioDevices = []
	navigator.mediaDevices.enumerateDevices().then(function(devices) {
		devices.forEach(function(device) {
			if(device.kind == "audiooutput" && device.deviceId != "default" && device.deviceId != "communications") {
				activeAudioDevices.push(device.deviceId)
				// If device circut not been added, add it
				if(!deviceExists(device.deviceId)) {
					n = "Unnamed Device "+Math.floor(Math.random() * (999 - 100) +100)
					audioDevices.unshift([device.deviceId, n])
				}
			}
		})
		enumerateAudioSources()
	})
}
function deviceExists(deviceId) {
	for (var i = audioDevices.length - 1; i >= 0; i--) {
		if(audioDevices[i][0] == deviceId)
			return true
	}
	return false
}
function checkActiveStatus(deviceId) {
	for (var i = activeAudioDevices.length - 1; i >= 0; i--) {
		if(activeAudioDevices[i] == deviceId)
			return "Connected"
	}
	return "Disconnected"
}
function enumerateAudioSources() {
	$("#audioDevices").empty()
	audioDevices.forEach(function(device) {
		$("#audioDevices").append(`
			<tr>
			<td>
			<input id="` + device[0] + `" value="` + device[1] + `">
			</td>
			<td>
			<button class="notRunnable updateButtonName" deviceID="` + device[0] + `">Update Name</button>
			</td>
			<td>
			<button class="notRunnable testButton" deviceID="` + device[0] + `">Sound Check</button>
			</td>
			<td>
			<button class="notRunnable removeDeviceButton" deviceID="` + device[0] + `" deviceName="` + device[1] + `">Remove Device</button>
			</td>
			<td>
			<span><em> ` + checkActiveStatus(device[0]) + `</em></span>
			</td>
			</tr>
		`)
	})
	createSchedule()
}
function refreshVitals() {
	$("#canvasWrapper").empty()
	mouseVitals = []
	for (var i = audioDevices.length - 1; i >= 0; i--) {
		mouseVitals.push([audioDevices[i][1].toString(),[],[],[],[],[]])
		$("#canvasWrapper").append("<p>"+audioDevices[i][1].toString()+"</p>")
		$("#canvasWrapper").append("<canvas id='" + audioDevices[i][1].toString() + "'></canvas>")
	}
}
parameters = []
var duration, maxTones, totalTones
var startDate, endDate
isRandom = false
syncTones = true
function updateParameters () {
	log("Experiment parameters updated")

	parameters = []
	parameters.push(["frequency", parseInt($("#frequencyInput").val())])
	parameters.push(["length", parseInt($("#lengthInput").val())])
	
	start = $("#startInput")[0].valueAsDate
	end = $("#endInput")[0].valueAsDate
	start.setHours(parseInt($("#startInput").val()))
	end.setHours(parseInt($("#endInput").val()))

	parameters.push(["start", start])
	parameters.push(["end", end])
	
	parameters.push(["numberTones", parseInt($("#numberTonesInput").val())])
	parameters.push(["timeBetween", parseInt($("#timeBetweenInput").val())])
	parameters.push(["fixedIntervalCheck", $("#fixedIntervalCheckInput").is(":checked")])
	parameters.push(["syncTones", $("#syncTonesCheckInput").is(":checked")])
	parameters.push(["bpMin", parseInt($("#bpMin").val())])
	parameters.push(["bpMax", parseInt($("#bpMax").val())])
	parameters.push(["bpTime", parseInt($("#bpTimeInput").val())])
	parameters.push(["bpLogRate", parseInt($("#bpLogRateInput").val())])
	parameters.push(["telemetryCheckInput", $("#telemetryCheckInput").is(":checked")])
	
	isRandom = !parameters[6][1]
	syncTones = parameters[7][1]

	// teleTrace param update
	$("#secondsInRange").text(parameters[10][1])
	$("#pointsInRange").text(calcDataPoints())

	startDate = new Date()
	startDate.setHours(parameters[2][1].getHours())
	startDate.setMinutes(parameters[2][1].getMinutes())
	startDate.setSeconds(0)
	endDate = new Date()
	endDate.setHours(parameters[3][1].getHours())
	endDate.setMinutes(parameters[3][1].getMinutes())
	endDate.setSeconds(0)

	// If end date is earlier than start date, move it forward a day
	if(endDate.getHours() <= startDate.getHours()) {
		endDate.setDate(endDate.getDate() + 1)
	}

	duration = (endDate - startDate) / (1000 * 60)

	$("#experimentLengthUI").text("Experiment Duration: "+parseInt(duration / 60)+" hours")

	if(parameters[5][1] <= 0) {
		log("Interval cannot be less than or equal to zero. Defaulting to one minute.", type="error")
		parameters[5][1] = 1
	}

	maxTones = parseInt(duration / parameters[5][1])
	$("#experimentMaxTonesUI").text("Maximum Tones from Interval: "+maxTones+" tones")

	totalTones = (parameters[4][1] > maxTones ? maxTones : parameters[4][1])

	$("#experimentTotalTonesUI").text("Total Tones per Run: "+totalTones+" tones")

	createSchedule()

	if(totalTones <= 0 || totalTones == null || isNaN(totalTones)) {
		log("Cannot run experiment with given test duration and interval limitations.", type="error")
		return
	}
	// Disable randomization on fixed intervals
	if (!isRandom) {
		$("#randomizeButton").prop("disabled", true)
	}
	else {
		$("#randomizeButton").prop("disabled", false)
	}
}
metaSchedule =[]
function createSchedule() {
	metaSchedule =[]
	if(!syncTones) {
		for (var i = 0; i < audioDevices.length; i++) {
			if(checkActiveStatus(activeAudioDevices[i])) {
				schedule = []
				schedule.push(audioDevices[i][1])
				schedule.push(generateSchedule())
				metaSchedule.push(schedule)
			}
		}
	}
	else {
		metaSchedule = [["All Devices", generateSchedule()]]
	}
	$("#scheduleUI").empty()
	// Iterate through each schedule
	for (var n = metaSchedule.length - 1; n >= 0; n--) {
		// Iterate through [title, [<date>]] within schedule
		for (var i = metaSchedule[n].length - 1; i >= 0; i--) {
			if(i > 0) {
				for (var x = metaSchedule[n][i].length - 1; x >= 0; x--) {
					$("#scheduleUI").prepend("<p>"+dateToHuman(metaSchedule[n][i][x])+"</p>")
				}
			}
			else {
				$("#scheduleUI").prepend("<p style='font-weight:bold;font-style:italic'>**** "+metaSchedule[n][i]+" ****</p>")
			}
		}
	}
}
function generateSchedule() {
	// Check if it is feasible to generate a random tone over interal
	if(totalTones * parameters[5][1] >= duration * 60 && isRandom) {
		log("Cannot generate random tones with given test duration and interval limitations. Tones will be generated on a fixed interval.", type="warning")
		isRandom = false
	}

	// Get all possible times in which the tone could be played
	times = []
	for (var i = 0; i < duration; i += parameters[5][1]) {
		times.push(i)
	}

	// Get all possible dates in which the tone could be played
	totalDates = []
	for (var i = 0; i < times.length; i++) {
		totalDates.push(new Date(startDate.getTime() + (times[i] * 60000)))
	}


	toneDates = []
	toneDatesRaw = []
	// Select dates on fixed interval
	if(!isRandom) {
		for (var i = 0; i < totalTones; i++) {	
			toneDatesRaw.push(totalDates[i])
			toneDates.push(dateToHuman(totalDates[i]))
		}
	}
	// Select dates on random interval
	else {
		toneDates = pickRandomFromList(totalDates, totalTones)
		toneDates.sort(
			function(a, b) {
				return new Date(a).getTime() - new Date(b).getTime()
			})
		for (var i = toneDates.length - 1; i >= 0; i--) {
			toneDatesRaw.unshift(toneDates[i])
		}
	}
	return toneDatesRaw
}
function pickRandomFromList(arr, n) {
	var result = new Array(n)
	var len = arr.length
	var taken = new Array(len)
	if (n > len)
		throw new RangeError("getRandom: More elements taken than available")
	while (n--) {
		var x = Math.floor(Math.random() * len)
		result[n] = arr[x in taken ? taken[x] : x]
		taken[x] = --len in taken ? taken[len] : len
	}
	return result
}
runningTimers = []
running = false
function runExperiment() {
    running = true
    $("#runButton").prop("disabled", true)
    $("#stopButton").prop("disabled", false)

    $(".notRunnable").each(function(index) {
        $(this).prop("disabled", true)
    })
    log("Experiment started!", "event")

    refreshVitals()

    // Iterate through schedules
    for (var i = 0; i < metaSchedule.length; i++) {
        let firstToneUpdate = true
        // Iterate through dates within schedules
        // ([["title",[<dates>]],["title",[<dates>]]])
        for (var n = 0; n < metaSchedule[i][1].length; n++) {
            let timeDiffMiliseconds = Math.abs(Date.now() - metaSchedule[i][1][n])
            let timeDiffSeconds = timeDiffMiliseconds / 1000
            let timeDiffMinutes = timeDiffSeconds / 60
            // Only if this is the first tone in the array
            if (firstToneUpdate) {
                log("Playing first tone for <b>" + metaSchedule[i][0] + "</b> on " + metaSchedule[i][1][n] + " in <b>" + parseInt(timeDiffMinutes) + " minutes</b>")
                firstToneUpdate = false
            }
            // Control scope of setTimeout
            function timerFunction(x, nextDate) {
                audioDevices.forEach(function(device) {
                    if (checkActiveStatus(device[0])) {
                        if (syncTones || device[1] == metaSchedule[x][0]) {
                            // If telemetry is not being used or vitals are within parameter range
                            if (!parameters[12][1] || telemetryInRange(mouseVitals[x][0])) {
                                playAudioID(device[0])
                                log("Tone played on " + device[1], "event")
                            } else {
                                // Try another tone 10 seconds later
                                // If new time is less than the min time diff from next tone
                                const today = new Date()
                                today.setSeconds(today.getSeconds() + 10)
                                if (today <= nextDate || nextDate == -1) {
                                    log("Vitals out of range for mouse " + mouseVitals[x][0] + ", trying again in 10 seconds.")
                                    runningTimers.push(setTimeout(() => timerFunction(x, nextDate), 10000))
                                } else {
                                    log("Vitals were not in range long enough time for mouse " + mouseVitals[x][0] + " to receive a tone.")
                                }
                            }
                        }
                    }
                })
            }
            if (metaSchedule[i][1].length > 1 && n + 1 < metaSchedule[i][1].length) {
                runningTimers.push(setTimeout(timerFunction, timeDiffMiliseconds, i, metaSchedule[i][1][n + 1]))
            } else {
                runningTimers.push(setTimeout(timerFunction, timeDiffMiliseconds, i, -1))
            }
            // If it's the last tone, stop experiment 30 seconds after
            if (n == metaSchedule[i][1].length - 1) {
                runningTimers.push(setTimeout(function() {
                    stopExperiment()
                }, timeDiffMiliseconds + 30000))
            }
        }
    }
}
function stopExperimentWithConfirmation() {
	if(confirm("Stop experiment?")) {
		stopExperiment()
	}
}
function stopExperiment() {
	$("#runButton").prop("disabled", false)
	$("#stopButton").prop("disabled", true)

	$(".notRunnable").each(function(index){
		$(this).prop("disabled", false)
	})

	log("Experiment stopped!", type="event")

	runningTimers.forEach(function(timer){
		clearTimeout(timer)
	})
	running = false
}
function updateDeviceName(deviceId) {
	for (var i = audioDevices.length - 1; i >= 0; i--) {
		if(audioDevices[i][0] == deviceId) {
			log(audioDevices[i][1] +" name changed to "+ $("#"+deviceId).val())
			audioDevices[i][1] = $("#"+deviceId).val()
			break
		}
	}
	refreshVitals()
	enumerateAudioSources()
}
function playAudioID(deviceId, test=false) {
	var ac = new AudioContext()
	var audio = new Audio()
	var osc = ac.createOscillator()
	osc.frequency.value = parameters[0][1]
	osc.start()
	var dest = ac.createMediaStreamDestination()
	osc.connect(dest)
	audio.srcObject = dest.stream
	promise = audio.setSinkId(deviceId)
	if (promise !== undefined) {
		promise.then(_ => {
			audio.play()
			if(test) {
				setTimeout(function(){
					audio.pause()
				}, 1000)
			}
			else {
				setTimeout(function(){
					audio.pause()
				}, (parameters[1][1]*1000))
			}
		}).catch(error => {
			log("Cannot play audio due to "+error, type="error")
		})
	}
}
function purgeDeviceMemory(deviceId, deviceName) {
	for (var i = audioDevices.length - 1; i >= 0; i--) {
		if(audioDevices[i][0] == deviceId) {
			log("Removed device "+audioDevices[i][1])
			audioDevices.splice(i, 1)
			enumerateAudioSources()
			break
		}
	}
}
// lol
function purgeAllDisabled() {
	for (var i = audioDevices.length - 1; i >= 0; i--) {
		if(checkActiveStatus(audioDevices[i][0]) == "Disconnected")
			purgeDeviceMemory(audioDevices[i][0], audioDevices[i][1])
	}
}
logData = []
function log(message, type="update") {
	var date = new Date()
	var time = dateToHuman(date)
	if(type == "update") {
		$("#elog").prepend("<tr style='color:black;font-weight:normal'><td style='width:12em'>"+time+"</td><td>[UPDATE]</td><td>"+message+"</td></tr>")
		logData.push([time, "UPDATE", message])
	}
	else if (type == "warning") {
		$("#elog").prepend("<tr style='color:black;font-weight:bold'><td style='width:12em'>"+time+"</td><td>[WARNING]</td><td>"+message+"</td></tr>")
		logData.push([time, "WARNING", message])
	}
	else if (type == "error") {
		$("#elog").prepend("<tr style='color:red;font-weight:bold'><td style='width:12em'>"+time+"</td><td>[ERROR]</td><td>"+message+"</td></tr>")
		logData.push([time, "ERROR", message])
	}
	else if(type == "event") {
		$("#elog").prepend("<tr style='color:blue;font-weight:bold'><td style='width:12em'>"+time+"</td><td>[EVENT]</td><td>"+message+"</td></tr>")
		logData.push([time, "EVENT", message])
	}
}
beginCapping = false
function teleLog(n, sys, dia, MAP, HR, TIME) {
	// Set max telelog element size to 3600
	if ($("#tlog tr").children().length > 3600) {
		if(!beginCapping) {
			beginCapping = true
			log("For performance, the Telemetry Log will only display 3600 rows. All data will still be saved and can be downloaded as normal.")
		}
		$("tr.yowtf").remove()
	}

	$("#tlog tr:first").after(`
		<tr class='yowtf'>
		<td>`+TIME+`</td>
		<td>[`+n+`]</td>
		<td>`+MAP+`</td>
		<td>`+sys+`</td>
		<td>`+dia+`</td>
		<td>`+HR+`</td>
		</tr>`
		)
}
function dateToHuman(date) {
	return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+" "+date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
}
function toCSV(table_id, n) {
	log("Function not yet active.",type="error")
}
chrome.sockets.tcp.create({}, function(createInfo) {
	chrome.sockets.tcp.connect(createInfo.socketId,
		"localhost", 6732, function(result) {
			if (result < 0) {
				$("#TeleDis").css("display", "block")
				$("#TeleCon").css("display", "none")
				log("Unable to connect to server", type="error")
			}
			else {
				$("#TeleDis").css("display", "none")
				$("#TeleCon").css("display", "block")
			}
		}
		)
})
var enc = new TextDecoder("utf-8")
chrome.sockets.tcp.onReceive.addListener(function(info) {
	parseLogString(enc.decode(info.data))
})
function parseLogString(message) {
	mouseID = null, MAP = null, sys = null, dia = null, HR = null
	// Check if message is meta
	if(message.substring(0,20).indexOf("HD-X11") > -1) {
		mouseID = message.substring(message.indexOf("(")+1, message.indexOf(")"))
		MAP = message.substring(getNthIndex(message,",",7)+1,getNthIndex(message,",",8))
		// Make sure we aren't getting overflow values
		if(MAP > 500 || MAP < 40) return;
		sys = message.substring(getNthIndex(message,",",5)+1,getNthIndex(message,",",6))
		dia = message.substring(getNthIndex(message,",",6)+1,getNthIndex(message,",",7))
		HR = message.substring(getNthIndex(message,",",9)+1,getNthIndex(message,",",10))
		var date = new Date()
		TIME = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
		for (var i = mouseVitals.length - 1; i >= 0; i--) {
			if(mouseVitals[i][0] == mouseID) {
				mouseVitals[i][1].push(MAP)
				mouseVitals[i][2].push(sys)
				mouseVitals[i][3].push(dia)
				mouseVitals[i][4].push(HR)
				mouseVitals[i][5].push(TIME)
				teleLog(mouseID,sys,dia,MAP,HR,TIME)
				updateTeleTrace(mouseVitals[i][0])
			}
		}
	}
}
function getNthIndex(string, subString, index) {
	return string.split(subString, index).join(subString).length
}
function runTestData () {
	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max+1);
		return Math.floor(Math.random() * (max - min)) + min;
	}
	setInterval(function() {
		sys = getRandomInt(100,140)
		dia = getRandomInt(80,90)
		MAP = (sys+dia)/2
		HR = getRandomInt(840,310)
		parseLogString(`
			?2;;1;HD-X11 (860612),0000:00:31.935729,2019/10/02 14:47:32.000 (Eastern Standard Time),,0,`+sys+`,`+dia+`,`+MAP+`,0,`+HR+`,0,9999900414574592,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0,0,0,0,0,0,0,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0,0,0,0,0,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0.0000,9999900414574592,9999900414574592,9999900414574592,9999900414574592
			`)
		sys = getRandomInt(100,140)
		dia = getRandomInt(80,90)
		MAP = (sys+dia)/2
		HR = getRandomInt(840,310)
		parseLogString(`
			?2;;1;HD-X11 (1041180),0000:00:31.935729,2019/10/02 14:47:32.000 (Eastern Standard Time),,0,`+sys+`,`+dia+`,`+MAP+`,0,`+HR+`,0,9999900414574592,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0,0,0,0,0,0,0,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0,0,0,0,0,0,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,9999900414574592,0.0000,9999900414574592,9999900414574592,9999900414574592,9999900414574592
			`)
	// }, 100)
}, parameters[11][1]*1000)
}
function updateTeleTrace(canvasID) {
	if(mouseVitals.length > 0) {
		var canvas = document.getElementById(canvasID)
		width  = 600
		height = parameters[9][1] + 20

		canvas.width = width
		canvas.height = height

		vertMult = 2.5

		var ctx = canvas.getContext("2d")
		ctx.clearRect(0, 0, width, height)

		// Vertical Axis
		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(0, height)
		ctx.stroke()

		// Range Bars
		ctx.lineWidth = .5
		if(telemetryInRange(canvasID)) 
			ctx.strokeStyle = "green"
		else
			ctx.strokeStyle = "red"

		ctx.fillText(parameters[8][1], width - 18, (height - parameters[8][1]) * vertMult + 10)
		ctx.fillText(parameters[9][1], width - 18, (height - parameters[9][1]) * vertMult + 10)

		ctx.beginPath()
		ctx.moveTo(0, (height - parameters[8][1]) * vertMult)
		ctx.lineTo(width, (height - parameters[8][1]) * vertMult)
		ctx.stroke()
		ctx.moveTo(0, (height - parameters[9][1]) * vertMult)
		ctx.lineTo(width, (height - parameters[9][1]) * vertMult)
		ctx.stroke()

		ctx.lineWidth = 1
		ctx.strokeStyle = "black"

		data = []
		baselineHistoryForTone = calcDataPoints()
		for (var i = mouseVitals.length - 1; i >= 0; i--) {
			if(mouseVitals[i][0] == canvasID) {
				for (var n = mouseVitals[i][1].length - 1; n >= 0; n--) {
					if(mouseVitals[i][1].length - n > baselineHistoryForTone) break;
					data.push(mouseVitals[i][1][n])
				}
				break
			}
		}

		var horiSubdivision = (width - 18) / data.length

		ctx.beginPath()
		ctx.moveTo(0,(height-data[0])*vertMult)
		for (var i = 0; i <= data.length - 1; i++) {
			x = i * horiSubdivision
			y = (height - data[i]) * vertMult
			ctx.lineTo(x, y)
			ctx.arc(x, y, 1, 0, 2 * Math.PI)
		}
		ctx.stroke()
	}
}
function calcDataPoints () {
	// time in range / updates per second
	return parseInt(parameters[10][1] / parameters[11][1])
}
function telemetryInRange(mouseID) {
	for (var i = 0; i < mouseVitals.length; i++) {
		if(mouseVitals[i][0] == mouseID.toString())
		{
			// If there enough points to compare, return false
			if(mouseVitals[i][1].length < calcDataPoints())
				return false
			
			for (var n = mouseVitals[i][1].length - 1; n >= 0; n--) {
				// If not(MAP is greater than min MAP and MAP is less than MAX map)
				// See: If MAP is not in an acceptable range return false
				if(!(mouseVitals[i][1][n] >= parameters[8][1] && mouseVitals[i][1][n] <= parameters[9][1]))
					return false

				// If all values were in range, break the loop and true
				if((mouseVitals[i][1].length) - n >= calcDataPoints())
					break
			}
			return true
		}
	}
	return false
}
function downloadAsCSV(arr, n) {
	var lineArray = []
	arr.forEach(function (infoArray, index) {
		var line = infoArray.join(",")
		lineArray.push(index == 0 ? "data:text/csv;charset=utf-8," + line : line)
	})
	var csvContent = lineArray.join("\n")

	var encodedUri = encodeURI(csvContent)
	var link = document.createElement("a")
	link.setAttribute("href", encodedUri)
	link.style.display = "none"
	link.setAttribute("download", n+".csv")
	document.body.appendChild(link)

	link.click()
	link.remove()
}
document.addEventListener('DOMContentLoaded', function() {
	$("#randomizeButton").click(function(){
		createSchedule()
	})
	$("#runButton").click(function(){
		runExperiment()
	})
	$("#stopButton").click(function(){
		stopExperiment()
	})
	$("#parametersButton").click(function(){
		updateParameters()
	})
	$("#refreshButton").click(function(){
		readAudioSources()
	})
	$("#clearDisconnectedButton").click(function(){
		purgeAllDisabled()
	})
	$("#eLogButton").click(function(){
		downloadAsCSV(logData, "event-log")
	})
	// TODO: Don't allow download unless some data has been collected
	$("#tLogButton").click(function(){
		temp = []
		for (var i = mouseVitals.length - 1; i >= 0; i--) {
			temp.push([mouseVitals[i][0]])
			temp.push(prepend("Time", mouseVitals[i][5]))
			temp.push(prepend("MAP", mouseVitals[i][1]))
			temp.push(prepend("Systolic", mouseVitals[i][2]))
			temp.push(prepend("Diastolic", mouseVitals[i][3]))
			temp.push(prepend("HR", mouseVitals[i][4]))
		}
		downloadAsCSV(temp, "telemetry-data")
	})
	$("#audioDevices").on("click", ".testButton", function() {
		playAudioID($(this).attr("deviceID"),test=true)
	})
	$("#audioDevices").on("click", ".removeDeviceButton", function() {
		purgeDeviceMemory($(this).attr("deviceID"),$(this).attr("deviceName"))
	})
	$("#audioDevices").on("click", ".updateButtonName", function() {
		updateDeviceName($(this).attr("deviceID"))
	})
	$("#toggleEvents").on("click", function() {
		$("#eventLog").slideToggle('slow');
	})
	$("#toggleTele").on("click", function() {
		$("#teleLog").slideToggle("slow");
	})
	$("#toggleTrace").on("click", function() {
		$("#traceLog").slideToggle("slow");
	})
	function prepend(value, array) {
		var newArray = array.slice()
		newArray.unshift(value)
		return newArray
	}
})