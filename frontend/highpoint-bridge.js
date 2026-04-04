// ==================== HIGHPOINT BRIDGE ====================
// This file MUST run in the MAIN world (page context) via manifest.json:
//   "world": "MAIN"
// It reads window.highpoint.cachedBuild and writes schedule data to localStorage.
// The conflict-checker.js (isolated world) reads from localStorage.

(function() {
  var KEY = 'pr_schedule_map';
  var USER_KEY = 'pr_user_id';
  var DAY_MAP = { mon: 'Mo', tues: 'Tu', wed: 'We', thurs: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su' };

  // Save user ID and name immediately — available before Build Schedule
  try {
    var hp = window.highpoint;
    if (hp && hp.user) {
      localStorage.setItem(USER_KEY, hp.user);
    }
    if (hp && hp.name) {
      localStorage.setItem('pr_user_name', hp.name);
    }
  } catch(e) {}


  function parseApiTime(timeStr) {
    if (!timeStr) return null;
    var parts = timeStr.split('.');
    var hours = parseInt(parts[0]);
    var minutes = parts[1] || '00';
    var ampm = hours >= 12 ? 'pm' : 'am';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return hours + ':' + minutes + ' ' + ampm;
  }

  function syncSchedule() {
    try {
      var hp = window.highpoint;
      if (!hp || !hp.cachedBuild || !hp.cachedBuild.schedules || !hp.cachedBuild.schedules[0]) return;

      var map = {};
      hp.cachedBuild.schedules[0].classes.forEach(function(cls) {
        var code = cls.subject + ' ' + cls.catalogNbr;
        var section = (cls.sections && cls.sections[0] && cls.sections[0].classSection) || cls.component || '';

        (cls.meetingPatterns || []).forEach(function(pattern) {
          if (!pattern.startTime || !pattern.endTime || !pattern.daysScheduled || !pattern.daysScheduled.length) return;

          var days = pattern.daysScheduled.map(function(d) { return DAY_MAP[d] || ''; }).join('');
          var start = parseApiTime(pattern.startTime);
          var end = parseApiTime(pattern.endTime);
          if (!days || !start || !end) return;

          if (!map[code]) map[code] = [];
          var key = section + '-' + days + '-' + start + '-' + end;
          var exists = map[code].some(function(s) {
            return (s.section + '-' + s.days + '-' + s.start + '-' + s.end) === key;
          });
          if (!exists) {
            map[code].push({ section: section, days: days, start: start, end: end });
          }
        });
      });

      if (Object.keys(map).length > 0) {
        localStorage.setItem(KEY, JSON.stringify(map));
      }
    } catch(e) {
      // silent
    }
  }

  // Sync immediately on load
  syncSchedule();

  // Re-sync every 5 seconds
  setInterval(syncSchedule, 5000);

  // Sync after Build Schedule or Save clicks (poll for hash change)
  document.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;
    var label = btn.querySelector('.cx-MuiButton-label');
    if (!label) return;
    var text = label.textContent.trim().toLowerCase();
    if (text.indexOf('build schedule') !== -1 || text === 'save') {
      var oldHash = '';
      try { oldHash = window.highpoint.cachedBuild.schedules[0].hash; } catch(e) {}

      var attempts = 0;
      var poll = setInterval(function() {
        attempts++;
        var newHash = '';
        try { newHash = window.highpoint.cachedBuild.schedules[0].hash; } catch(e) {}

        if (newHash !== oldHash || attempts >= 20) {
          clearInterval(poll);
          syncSchedule();
        }
      }, 500);
    }
  }, true);
})();