var audioCtx;
var source;
var canvas1;
var canvas2;
var ctx1;
var ctx2;
var method = "autoCorrelation"; //метода поиска ноты
var timeDomainAnalyzer;
var timeDomainData; //массив данных во временной области
var frequencyDomainAnalyzer;
var frequencyDomainData; //массив данных в частотной области
var NOTES = {
    "H second": 987.75,
    "Hb second": 932.32,
    "A second": 880.00,
    "G# second": 830.60,
    "G second": 784.00,
    "F# second": 739.98,
    "F second": 698.46,
    "E second": 659.26,
    "D# second": 622.26,
    "D second": 587.32,
    "C# second": 554.36,
    "C second": 523.25,
    "H small": 246.96,
    "Hb small": 233.08,
    "A small": 220.00,
    "G# small": 207.00,
    "G small": 196.00,
    "F# small": 185.00,
    "F small": 174.62,
    "E small": 164.81,
    "D# small": 155.56,
    "D small": 147.83,
    "C# small": 138.59,
    "C small": 130.82,
    "H big": 123.48,
    "Hb big": 116.54,
    "A big": 110.00,
    "G# big": 103.80,
    "G big": 98.00,
    "F# big": 92.50,
    "F big": 87.31,
    "E big": 82.41,
    "E first": 329.63,
    "F first": 349.23,
    "F# first": 369.99,
    "G first": 392.00,
    "G# first": 415.30,
    "A first": 440.00,
    "Hb first": 466.16,
    "H first": 493.88
};


navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
frequencyDomainAnalyzer = audioCtx.createAnalyser();
frequencyDomainAnalyzer.minDecibels = -75;
frequencyDomainAnalyzer.maxDecibels = -30;
frequencyDomainAnalyzer.smoothingTimeConstant = 0.82;
frequencyDomainAnalyzer.fftSize = 4096;
console.log("frequencyDomainAnalyzer.fftSize " + frequencyDomainAnalyzer.fftSize);
timeDomainAnalyzer = audioCtx.createAnalyser();
timeDomainAnalyzer.fftSize = 4096;
timeDomainAnalyzer.smoothingTimeConstant = 0.9;
console.log("timeDomainAnalyzer.fftSize " + timeDomainAnalyzer.fftSize);
if (navigator.getUserMedia) {
    console.log('getUserMedia поддерживается.');
    navigator.getUserMedia(
        {
            audio: {
                sampleRate: "200",
                sampleSize: 1,
                noiseSuppression: true,
                echoCancellation: true,
                volume: 0.3
            }
        },

        // в случае успеха
        function (stream) {
            source = audioCtx.createMediaStreamSource(stream);
            console.log("audioCtx sampleRate " + audioCtx.sampleRate);
            if (method === "autoCorrelation") {
                source.connect(timeDomainAnalyzer);
            } else {
                source.connect(frequencyDomainAnalyzer);
            }
            console.log("timeDomainAnalyzer подключен");
            visualize();
        },

        // если возникла ошибка
        function (err) {
            console.log('Возникла ошибка: ' + err);
        }
    );
} else {
    console.log('getUserMedia не поддерживается вашим браузером!');
}

canvas1 = document.getElementById("canvas1");
ctx1 = canvas1.getContext("2d");
canvas2 = document.getElementById("canvas2");
ctx2 = canvas2.getContext("2d");
document.getElementById("about").style.display = "none";

var timeDataLength = timeDomainAnalyzer.fftSize;
var frequencyDataLength = frequencyDomainAnalyzer.frequencyBinCount;

function changeMethod() {
    var inp = document.getElementsByName("method");
    for (var i = 0; i < inp.length; i++) {
        if (inp[i].type === "radio" && inp[i].checked) {
            method = inp[i].value;
            console.log("Метод изменился на " + method);
            break;
        }
    }
    if (method === "autoCorrelation") {
        source.connect(timeDomainAnalyzer);
        console.log("Подключен timeDomainAnalyzer");
        source.disconnect(frequencyDomainAnalyzer);
        console.log("Отключен frequencyDomainAnalyzer");
    } else {
        source.connect(frequencyDomainAnalyzer);
        console.log("Подключен frequencyDomainAnalyzer");
        source.disconnect(timeDomainAnalyzer);
        console.log("Отключен timeDomainAnalyzer");
    }

}

function showTuner() {
    document.getElementById("about").style.display = "none";
    document.getElementById("grid").style.display = "grid";
}

function showAbout() {
    document.getElementById("about").style.display = "inherit";
    document.getElementById("grid").style.display = "none";
}

function visualize() {
    timeDomainData = new Float32Array(timeDataLength);
    frequencyDomainData = new Uint8Array(frequencyDataLength);
    drawGraph();
}


function autoCorrelate() {
    var sampleRate = audioCtx.sampleRate;
    var MIN_SAMPLES = 0;
    var GOOD_ENOUGH_CORRELATION = 0.985;
    var SIZE = timeDataLength;
    var MAX_SAMPLES = Math.floor(SIZE / 2);
    var bestOffset = -1;
    var bestCorrelation = 0;
    var rms = 0;
    var foundGoodCorrelation = false;
    for (var i = 0; i < SIZE; i++) {
        var val = timeDomainData[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.010) // not enough signal
        return -1;

    var lastCorrelation = 1;
    for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
        var correlation = 0;

        for (i = 0; i < MAX_SAMPLES; i++) {
            correlation += Math.abs((timeDomainData[i]) - (timeDomainData[i + offset]));
        }
        correlation = 1 - (correlation / MAX_SAMPLES);
        if ((correlation > GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
            foundGoodCorrelation = true;
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        } else if (foundGoodCorrelation) {
            return sampleRate / bestOffset;
        }
        lastCorrelation = correlation;
    }
    return -1;
}

function frequencyCorrelate() {
    var correlation = 0;
    var maxCorrelation = -1;
    var baseFrequency = -1;
    var harmonic = 0;
    for (var i = 0; i < frequencyDataLength / 15; i++) {
        for (harmonic = i; harmonic < 7 * i; harmonic += i) {
            correlation += frequencyDomainData[harmonic];
        }
        if (correlation > maxCorrelation+10) {
            maxCorrelation = correlation;
            baseFrequency = i;
        }

        correlation=0;

    }
    document.getElementById("pitchesTable").innerText ="" + 2*baseFrequency / frequencyDataLength * audioCtx.sampleRate / 4;
    return baseFrequency;
}

function drawGraph() {
    drawVisual = requestAnimationFrame(drawGraph);
    var canvas_1_Width = canvas1.width;
    var canvas_1_height = canvas1.height;
    var canvas_2_Width = canvas2.width;
    var canvas_2_height = canvas2.height;
    if (method === "autoCorrelation") {
        timeDomainAnalyzer.getFloatTimeDomainData(timeDomainData);
        document.getElementById("pitchesTable").innerText = "" + autoCorrelate();
        ctx1.clearRect(0, 0, canvas_1_Width, canvas_1_height);
        ctx1.lineWidth = 1;
        ctx1.strokeStyle = 'rgb(0, 200, 0)';
        ctx1.beginPath();
        var sliceWidth = canvas_1_Width * 1.0 / timeDataLength;
        var x = 0;
        for (i = 0; i < timeDataLength; i++) {
            var v = timeDomainData[i];
            var y = 2 * v * canvas_1_height / 2 + canvas_1_height / 2;
            if (i === 0) {
                ctx1.moveTo(x, y);
            } else {
                ctx1.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx1.lineTo(canvas1.width, canvas1.height / 2);
        ctx1.stroke();
    }
    else {
        frequencyDomainAnalyzer.getByteFrequencyData(frequencyDomainData);
        var fc = frequencyCorrelate();
        ctx1.clearRect(0, 0, canvas_1_Width, canvas_1_height);
        var barWidth = (canvas_1_Width / frequencyDataLength) * 5;
        var barHeight;
        for (var i = 0; i < frequencyDataLength; i++) {
            barHeight = 2 * frequencyDomainData[i];
            var hue = i / frequencyDataLength * 360 * 2;
            ctx1.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            ctx1.fillRect(i * barWidth, canvas_1_height - barHeight / 2, barWidth, barHeight / 2);
        }
        ctx1.fillStyle = "rgb(0,0,250)";
        for (var harmonic = fc; harmonic < 7 * fc; harmonic += fc) {
            ctx1.fillRect(harmonic * barWidth, 0, barWidth, canvas_1_height);
        }


    }
}
