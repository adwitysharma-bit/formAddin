

/**
 * @returns {{initialize: Function, focus: Function, blur: Function, startup; Function, shutdown: Function}}
 */
geotab.addin.driverForm = function () {
  'use strict';
  const appName = 'driverForm';
  const addinId = 'azc4ODM3ZTgtNGQ1Yi1jN2V';
  const FORM_DEF_ID = 'aubcmTag5IkKkoaROSVpGdw';

  const SUBMISSION_ID = 'azc4ODM3ZTgtNGQ1Yi1jN2V';

  let api = null;
  let state = null;

  let _forms = [];
  const _context = { vehicleName: '', vin: '', userName: '' };

  function $(sel) { return document.querySelector(sel); }

  function show(el, yes) {
    if (!el) return;
    el.classList.toggle('hidden', !yes);
  }

  function setLoading(isLoading, message) {
    const loading = $('#loading');
    if (!loading) return;
    if (message) loading.textContent = message;
    show(loading, !!isLoading);
  }

  function setContextUI() {
    $('#driverForm-driver') && ($('#driverForm-driver').textContent = _context.userName || '');
    $('#driverForm-vehicle') && ($('#driverForm-vehicle').textContent = _context.vehicleName || '');
    $('#driverForm-vin') && ($('#driverForm-vin').textContent = _context.vin || '');
  }

  function normalizeDateTimeLocalValue(d) {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  }

  function fillSmartDefaults(fieldName, fieldType) {
    const name = (fieldName || '').toLowerCase();
    const type = (fieldType || '').toLowerCase();

    if (name.includes('vin')) return _context.vin || '';
    if (name.includes('vehicle')) return _context.vehicleName || '';
    if (name.includes('driver')) return _context.userName || '';

    if (type === 'date') return normalizeDateTimeLocalValue(new Date());
    return '';
  }

  function renderForm() {
    const selector = $('#form-selector');
    const container = $('#dynamic-form');
    if (!selector || !container) return;

    const idx = Number(selector.value || 0);
    const item = _forms[idx];
    const def = item && item.details ? item.details : null;

    container.innerHTML = '';
    if (!def || !Array.isArray(def.fields)) {
      container.textContent = 'Invalid form template.';
      show(container, true);
      return;
    }

    def.fields.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.className = 'driverForm-field';

      const fieldType = String(field.type || 'text').toLowerCase();
      const inputName = String(field.name || '');

      const readableType =
        fieldType === 'boolean' ? 'Yes / No' :
          fieldType === 'date' ? 'Date & Time' :
            fieldType === 'number' ? 'Number' :
              'Text';

      if (fieldType === 'boolean') {
        const row = document.createElement('div');
        row.className = 'driverForm-checkboxRow';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-input';
        checkbox.setAttribute('data-name', inputName);

        const label = document.createElement('label');
        label.className = 'driverForm-fieldLabel';
        label.textContent = String(field.name || '').toUpperCase();

        const hint = document.createElement('div');
        hint.style.fontSize = '12px';
        hint.style.opacity = '0.7';
        hint.textContent = `Type: ${readableType}`;

        row.appendChild(checkbox);
        row.appendChild(label);
        wrapper.appendChild(row);
        wrapper.appendChild(hint);
      } else {
        const label = document.createElement('label');
        label.className = 'driverForm-fieldLabel';
        label.textContent = String(field.name || '').toUpperCase();

        const input = document.createElement('input');
        input.className = 'driverForm-input form-input';
        input.setAttribute('data-name', inputName);

        if (fieldType === 'number') input.type = 'number';
        else if (fieldType === 'date') input.type = 'datetime-local';
        else input.type = 'text';

        input.placeholder = `Type: ${readableType}`;

        const preset = fillSmartDefaults(inputName, fieldType);
        if (fieldType === 'date') input.value = preset || normalizeDateTimeLocalValue(new Date());
        else input.value = preset;

        wrapper.appendChild(label);
        wrapper.appendChild(input);
      }

      container.appendChild(wrapper);
    });

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'driverForm-submit';
    btn.textContent = 'Submit Form';
    btn.addEventListener('click', submitData);

    container.appendChild(btn);
    show(container, true);
  }


  function submitData() {
    if (!api) return;

    const selector = $('#form-selector');
    const container = $('#dynamic-form');
    if (!selector || !container) return;

    const idx = Number(selector.value || 0);
    const chosen = _forms[idx];
    const formName = chosen && chosen.details ? (chosen.details.formName || 'Unnamed Form') : 'Unnamed Form';

    const inputs = container.querySelectorAll('.form-input');
    const payload = {
      timestamp: new Date().toISOString(),
      formName,
      context: {
        userName: _context.userName || '',
        vehicleName: _context.vehicleName || '',
        vin: _context.vin || '',
        deviceId: state?.device?.id || ''
      },
      data: {}
    };

    inputs.forEach(input => {
      const key = input.getAttribute('data-name') || '';
      payload.data[key] = (input.type === 'checkbox') ? input.checked : input.value;
    });


    api.call(
      'Add',
      { typeName: 'AddInData', entity: { addInId: SUBMISSION_ID, details: payload } },
      function () { alert('Form saved successfully!'); },
      function (err) { alert('Error: ' + err); }
    );
  }

  function populateSelector() {
    const selector = $('#form-selector');
    const wrap = $('#form-selector-container');
    if (!selector || !wrap) return;

    selector.innerHTML = '';
    _forms.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = (f && f.details && f.details.formName) ? f.details.formName : '(Unnamed)';
      selector.appendChild(opt);
    });

    selector.onchange = renderForm;
    show(wrap, _forms.length > 0);
  }

  function loadTemplatesAndRender() {
    if (!api) return;

    setLoading(true, 'Loading forms…');
    show($('#dynamic-form'), false);

    api.call(
      'Get',
      { typeName: 'AddInData', search: { addInId: FORM_DEF_ID } },
      function (results) {
        _forms = Array.isArray(results) ? results : [];

        if (_forms.length === 0) {
          setLoading(true, 'No forms found.');
          show($('#form-selector-container'), false);
          return;
        }

        setLoading(false);
        populateSelector();
        renderForm();
      },
      function (err) {
        setLoading(true, 'Error loading forms.');
      }
    );
  }

  function loadContextThenForms(freshApi, freshState, done) {
    api = freshApi;
    state = freshState;

    api.getSession(function (session) {
      _context.userName = (session && session.userName) ? session.userName : '';

      const deviceId = state && state.device ? state.device.id : null;
      if (!deviceId) {
        setContextUI();
        loadTemplatesAndRender();
        done && done();
        return;
      }

      api.call(
        'Get',
        { typeName: 'Device', search: { id: deviceId } },
        function (devices) {
          const d = (Array.isArray(devices) && devices[0]) ? devices[0] : null;
          _context.vehicleName = d && d.name ? d.name : '';
          _context.vin = d?.vehicleIdentificationNumber || '';

          setContextUI();
          loadTemplatesAndRender();
          done && done();
        },
        function (err) {
          setContextUI();
          loadTemplatesAndRender();
          done && done();
        }
      );
    });
  }


  return {
    startup: function (freshApi, freshState, cb) { cb(); },

    initialize: function (freshApi, freshState, cb) {
      const root = document.getElementById('driverForm-app');
      if (freshState && freshState.translate) freshState.translate(root || '');

      show(root, true);

      loadContextThenForms(freshApi, freshState, cb);
    },

    focus: function (freshApi, freshState) {
      loadContextThenForms(freshApi, freshState);
    },

    blur: function () { },
    shutdown: function () { return Promise.resolve(); }
  };
};
