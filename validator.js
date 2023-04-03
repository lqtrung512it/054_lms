function Validator(options) {
    let selectorRules = {};

    function validate(inputElement, rule) {
        let errorMessage;
        let errorElement = inputElement.parentElement.querySelector(options.errorSelector);

        let rules = selectorRules[rule.selector];

        for (let i = 0; i < rules.length; ++i) {
            errorMessage = rules[i](inputElement.value);
            if (errorMessage) break;
        }

        if (errorMessage) {
            errorElement.innerText = errorMessage;
            inputElement.parentElement.classList.add('invalid');
        } else {
            errorElement.innerText = '';
            inputElement.parentElement.classList.remove('invalid');
        }

        return !errorMessage;
    }

    let formElement = document.querySelector(options.form);

    if (formElement) {

        formElement.onClick = function (e) {
            e.preventDefault();

            let isFormValid = true;

            options.rules.forEach(function (rule) {
                let inputElement = formElement.querySelector(rule.selector);
                let isValid = validate(inputElement, rule);

                if (!isValid) {
                    isFormValid = false;
                }
            });

            if (isFormValid) {
                if (typeof options.onClick === 'function') {
                    let enableInputs = formElement.querySelectorAll('[name]');

                    let formValues = Array.from(enableInputs).reduce(function (values, input) {
                        return (values[input.name] = input.value) && values;
                    }, {});

                    options.onClick(formValues);
                } else {
                    formElement.onClick();
                }
            }
        }

        options.rules.forEach(function (rule) {

            if (Array.isArray(selectorRules[rule.selector])) {
                selectorRules[rule.selector].push(rule.test);
            } else {
                selectorRules[rule.selector] = [rule.test];
            }

            let inputElement = formElement.querySelector(rule.selector);

            if (inputElement) {
                inputElement.onblur = function () {
                    validate(inputElement, rule);
                }

                inputElement.oninput = function () {
                    let errorElement = inputElement.parentElement.querySelector(options.errorSelector);
                    errorElement.innerText = '';
                    inputElement.parentElement.classList.remove('invalid');
                }
            }
        })
    }
}

Validator.isRequired = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.trim() ? undefined : message || 'Please enter this field!';
        }
    }
}

Validator.isUsername = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            const regex = /[^0-9a-zA-Z]/;
            return !regex.test(value) ? undefined : message || 'Username should not contain special characters';
        }
    }
}

Validator.isEmail = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            return regex.test(value) ? undefined : message || 'This field must be email';
        }
    }
}

Validator.minLength = function (selector, min, message) {
    return {
        selector: selector,
        test: function (value) {
            return value.length >= min ? undefined : message || `Please enter at ${min} characters`;
        }
    }
}

Validator.isPassword = function (selector, message) {
    return {
        selector: selector,
        test: function (value) {
            const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            return regex.test(value) ? undefined : message || 'Please enter at leat 8 characters, at least one uppercase letter, one lowercase letter, one number and one special character';
        }
    }
}

Validator.isConfirmed = function (selector, getConfirmValue, message) {
    return {
        selector: selector,
        test: function (value) {
            return value === getConfirmValue() ? undefined : message || 'Input vlue is not correct';
        }
    }
}