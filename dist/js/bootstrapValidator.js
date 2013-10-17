/**
 * BootstrapValidator v0.2.0-dev (http://github.com/nghuuphuoc/bootstrapvalidator)
 *
 * A jQuery plugin to validate form fields. Use with Bootstrap 3
 *
 * @author      Nguyen Huu Phuoc <phuoc@huuphuoc.me>
 * @copyright   (c) 2013 Nguyen Huu Phuoc
 * @license     MIT
 */

(function($) {
    var BootstrapValidator = function(form, options) {
        this.$form   = $(form);
        this.options = $.extend({}, BootstrapValidator.DEFAULT_OPTIONS, options);

        this.invalidFields      = {};
        this.xhrRequests        = {};
        this.numPendingRequests = null;
        this.formSubmited       = false;

        this._init();
    };

    // The default options
    BootstrapValidator.DEFAULT_OPTIONS = {
        // The form CSS class
        elementClass: 'bootstrap-validator-form',

        // Default invalid message
        message: 'This value is not valid',

        // The submit buttons selector
        // These buttons will be disabled when the form input are invalid
        submitButtons: 'button[type="submit"]',

        // The custom submit handler
        // It will prevent the form from the default submitting
        //
        //  submitHandler: function(validator, form) {
        //      - validator is the BootstrapValidator instance
        //      - form is the jQuery object present the current form
        //  }
        submitHandler: null,

        // Map the field name with validator rules
        fields: null
    };

    BootstrapValidator.prototype = {
        constructor: BootstrapValidator,

        /**
         * Init form
         */
        _init: function() {
            if (this.options.fields == null) {
                return;
            }

            var that = this;
            this.$form
                // Disable client side validation in HTML 5
                .attr('novalidate', 'novalidate')
                .addClass(this.options.elementClass)
                .on('submit', function(e) {
                    that.formSubmited = true;
                    if (that.options.fields) {
                        for (var field in that.options.fields) {
                            if (that.numPendingRequests > 0 || that.numPendingRequests == null) {
                                // Check if the field is valid
                                var $field = that.getFieldElement(field);
                                if ($field.data('bootstrapValidator.isValid') !== true) {
                                    that.validateField(field);
                                }
                            }
                        }
                        if (!that.isValid()) {
                            that.$form.find(that.options.submitButtons).attr('disabled', 'disabled');
                            e.preventDefault();
                        } else {
                            if (that.options.submitHandler && 'function' == typeof that.options.submitHandler) {
                                that.options.submitHandler.call(that, that, that.$form);
                                return false;
                            }
                        }
                    }
                });

            for (var field in this.options.fields) {
                this._initField(field);
            }
        },

        /**
         * Init field
         *
         * @param {String} field The field name
         */
        _initField: function(field) {
            if (this.options.fields[field] == null || this.options.fields[field].validators == null) {
                return;
            }

            var $field = this.getFieldElement(field);
            if (null == $field) {
                return;
            }

            // Create a help block element for showing the error
            var that      = this,
                $parent   = $field.parents('.form-group'),
                helpBlock = $parent.find('.help-block');

            if (helpBlock.length == 0) {
                var $small = $('<small/>').addClass('help-block').appendTo($parent);
                $field.data('bootstrapValidator.error', $small);

                // Calculate the number of columns of the label/field element
                // Then set offset to the help block element
                var label, cssClasses, offset;
                if (label = $parent.find('label').get(0)) {
                    cssClasses = $(label).attr('class').split(' ');
                    for (var i = 0; i < cssClasses.length; i++) {
                        if (cssClasses[i].substr(0, 7) == 'col-lg-') {
                            offset = cssClasses[i].substr(7);
                            break;
                        }
                    }
                } else {
                    cssClasses = $parent.children().eq(0).attr('class').split(' ');
                    for (var i = 0; i < cssClasses.length; i++) {
                        if (cssClasses[i].substr(0, 14) == 'col-lg-offset-') {
                            offset = cssClasses[i].substr(14);
                            break;
                        }
                    }
                }
                if (offset) {
                    $small.addClass('col-lg-offset-' + offset).addClass('col-lg-' + parseInt(12 - offset));
                }
            } else {
                $field.data('bootstrapValidator.error', helpBlock.eq(0));
            }

            var type  = $field.attr('type'),
                event = ('checkbox' == type || 'radio' == type || 'SELECT' == $field.get(0).tagName) ? 'change' : 'keyup';
            $field.on(event, function() {
                that.formSubmited = false;
                that.validateField(field);
            });
        },

        /**
         * Get field element
         *
         * @param {String} field The field name
         * @returns {jQuery}
         */
        getFieldElement: function(field) {
            var fields = this.$form.find('[name="' + field + '"]');
            return (fields.length == 0) ? null : $(fields[0]);
        },

        /**
         * Validate given field
         *
         * @param {String} field The field name
         */
        validateField: function(field) {
            var $field = this.getFieldElement(field);
            if (null == $field) {
                // Return if cannot find the field with given name
                return;
            }
            var that       = this,
                validators = that.options.fields[field].validators;
            for (var validatorName in validators) {
                if (!$.fn.bootstrapValidator.validators[validatorName]) {
                    continue;
                }
                var isValid = $.fn.bootstrapValidator.validators[validatorName].validate(that, $field, validators[validatorName]);
                if (isValid === false) {
                    that.showError($field, validatorName);
                    break;
                } else if (isValid === true) {
                    that.removeError($field);
                }
            }
        },

        /**
         * Show field error
         *
         * @param {jQuery} $field The field element
         * @param {String} validatorName
         */
        showError: function($field, validatorName) {
            var field     = $field.attr('name'),
                validator = this.options.fields[field].validators[validatorName],
                message   = validator.message || this.options.message,
                $parent   = $field.parents('.form-group');

            this.invalidFields[field] = true;

            // Add has-error class to parent element
            $parent.removeClass('has-success').addClass('has-error');

            $field.data('bootstrapValidator.error').html(message).show();

            this.$form.find(this.options.submitButtons).attr('disabled', 'disabled');
        },

        /**
         * Remove error from given field
         *
         * @param {jQuery} $field The field element
         */
        removeError: function($field) {
            delete this.invalidFields[$field.attr('name')];
            $field.parents('.form-group').removeClass('has-error').addClass('has-success');
            $field.data('bootstrapValidator.error').hide();
            this.$form.find(this.options.submitButtons).removeAttr('disabled');
        },

        /**
         * Start remote checking
         *
         * @param {jQuery} $field The field element
         * @param {String} validatorName
         * @param {XMLHttpRequest} xhr
         */
        startRequest: function($field, validatorName, xhr) {
            var field = $field.attr('name');

            $field.data('bootstrapValidator.isValid', false);
            this.$form.find(this.options.submitButtons).attr('disabled', 'disabled');

            if(this.numPendingRequests == null){
                this.numPendingRequests = 0;
            }
            this.numPendingRequests++;
            // Abort the previous request
            if (!this.xhrRequests[field]) {
                this.xhrRequests[field] = {};
            }

            if (this.xhrRequests[field][validatorName]) {
                this.numPendingRequests--;
                this.xhrRequests[field][validatorName].abort();
            }
            this.xhrRequests[field][validatorName] = xhr;
        },

        /**
         * Complete remote checking
         *
         * @param {jQuery} $field The field element
         * @param {String} validatorName
         * @param {boolean} isValid
         */
        completeRequest: function($field, validatorName, isValid) {
            if (isValid === false) {
                this.showError($field, validatorName);
            } else if (isValid === true) {
                this.removeError($field);
                $field.data('bootstrapValidator.isValid', true);
            }

            var field = $field.attr('name');

            delete this.xhrRequests[field][validatorName];

            this.numPendingRequests--;
            if (this.numPendingRequests <= 0) {
                this.numPendingRequests = 0;
                if (this.formSubmited) {
                    if (this.options.submitHandler && 'function' == typeof this.options.submitHandler) {
                        this.options.submitHandler.call(this, this, this.$form);
                    } else {
                        this.$form.submit();
                    }
                }
            }
        },

        /**
         * Check the form validity
         *
         * @returns {boolean}
         */
        isValid: function() {
            if (this.numPendingRequests > 0) {
                return false;
            }
            for (var field in this.invalidFields) {
                if (this.invalidFields[field]) {
                    return false;
                }
            }
            return true;
        }
    };

    // Plugin definition
    $.fn.bootstrapValidator = function(options) {
        return this.each(function() {
            var $this = $(this), data = $this.data('bootstrapValidator');
            if (!data) {
                $this.data('bootstrapValidator', (data = new BootstrapValidator(this, options)));
            }
        });
    };

    // Available validators
    $.fn.bootstrapValidator.validators = {};

    $.fn.bootstrapValidator.Constructor = BootstrapValidator;
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.between = {
        /**
         * Return true if the input value is between (strictly or not) two given numbers
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Can consist of the following keys:
         * - min
         * - max
         * - inclusive [optional]: Can be true or false. Default is true
         * - message: The invalid message
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = parseFloat($field.val());
            return (options.inclusive === true)
                        ? (value > options.min && value < options.max)
                        : (value >= options.min && value <= options.max);
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.digits = {
        /**
         * Return true if the input value contains digits only
         *
         * @param {BootstrapValidator} validator Validate plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            return /^\d+$/.test($field.val());
        }
    }
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.emailAddress = {
        /**
         * Return true if and only if the input value is a valid email address
         *
         * @param {BootstrapValidator} validator Validate plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = $field.val(),
                // Email address regular expression
                // http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
                emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return emailRegExp.test(value);
        }
    }
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.greaterThan = {
        /**
         * Return true if the input value is greater than or equals to given number
         *
         * @param {BootstrapValidator} validator Validate plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Can consist of the following keys:
         * - value: The number used to compare to
         * - inclusive [optional]: Can be true or false. Default is true
         * - message: The invalid message
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = parseFloat($field.val());
            return (options.inclusive === true) ? (value > options.value) : (value >= options.value);
        }
    }
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.hexColor = {
        /**
         * Return true if the input value is a valid hex color
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Can consist of the following keys:
         * - message: The invalid message
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = $field.val();
            return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(value);
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.identical = {
        /**
         * Check if input value equals to value of particular one
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Consists of the following key:
         * - field: The name of field that will be used to compare with current one
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value        = $field.val(),
                $compareWith = validator.getFieldElement(options.field);
            if ($compareWith && value == $compareWith.val()) {
                validator.removeError($compareWith);
                return true;
            } else {
                return false;
            }
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.lessThan = {
        /**
         * Return true if the input value is less than or equal to given number
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Can consist of the following keys:
         * - value: The number used to compare to
         * - inclusive [optional]: Can be true or false. Default is true
         * - message: The invalid message
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = parseFloat($field.val());
            return (options.inclusive === true) ? (value < options.value) : (value <= options.value);
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.notEmpty = {
        /**
         * Check if input value is empty or not
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var type = $field.attr('type');
            return ('checkbox' == type || 'radio' == type) ? $field.is(':checked') : ($.trim($field.val()) != '');
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.regexp = {
        /**
         * Check if the element value matches given regular expression
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Consists of the following key:
         * - regexp: The regular expression you need to check
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = $field.val();
            return value.match(options.regexp);
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.remote = {
        /**
         * Request a remote server to check the input value
         *
         * @param {BootstrapValidator} validator Plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Can consist of the following keys:
         * - url
         * - data [optional]: By default, it will take the value
         *  {
         *      <fieldName>: <fieldValue>
         *  }
         * - message: The invalid message
         * @returns {string}
         */
        validate: function(validator, $field, options) {
            var value = $field.val(), name = $field.attr('name'), data = options.data;
            if (data == null) {
                data       = {};
                data[name] = value;
            }
            var xhr = $.ajax({
                type: 'POST',
                url: options.url,
                dataType: 'json',
                data: data
            }).success(function(response) {
                var isValid =  response.valid === true || response.valid === 'true';
                validator.completeRequest($field, 'remote', isValid);
            });
            validator.startRequest($field, 'remote', xhr);

            return 'pending';
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.stringLength = {
        /**
         * Check if the length of element value is less or more than given number
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options Consists of following keys:
         * - min
         * - max
         * At least one of two keys is required
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            var value = $.trim($field.val()), length = value.length;
            if ((options.min && length < options.min) || (options.max && length > options.max)) {
                return false;
            }

            return true;
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.uri = {
        /**
         * Return true if the input value is a valid URL
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options
         * @returns {boolean}
         */
        validate: function(validator, $field, options) {
            // Credit to https://gist.github.com/dperini/729294
            //
            // Regular Expression for URL validation
            //
            // Author: Diego Perini
            // Updated: 2010/12/05
            //
            // the regular expression composed & commented
            // could be easily tweaked for RFC compliance,
            // it was expressly modified to fit & satisfy
            // these test for an URL shortener:
            //
            //   http://mathiasbynens.be/demo/url-regex
            //
            // Notes on possible differences from a standard/generic validation:
            //
            // - utf-8 char class take in consideration the full Unicode range
            // - TLDs have been made mandatory so single names like "localhost" fails
            // - protocols have been restricted to ftp, http and https only as requested
            //
            // Changes:
            //
            // - IP address dotted notation validation, range: 1.0.0.0 - 223.255.255.255
            //   first and last IP address of each class is considered invalid
            //   (since they are broadcast/network addresses)
            //
            // - Added exclusion of private, reserved and/or local networks ranges
            //
            // Compressed one-line versions:
            //
            // Javascript version
            //
            // /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/i
            //
            // PHP version
            //
            // _^(?:(?:https?|ftp)://)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\x{00a1}-\x{ffff}0-9]+-?)*[a-z\x{00a1}-\x{ffff}0-9]+)(?:\.(?:[a-z\x{00a1}-\x{ffff}0-9]+-?)*[a-z\x{00a1}-\x{ffff}0-9]+)*(?:\.(?:[a-z\x{00a1}-\x{ffff}]{2,})))(?::\d{2,5})?(?:/[^\s]*)?$_iuS
            var urlExp = new RegExp(
                "^" +
                // protocol identifier
                "(?:(?:https?|ftp)://)" +
                // user:pass authentication
                "(?:\\S+(?::\\S*)?@)?" +
                "(?:" +
                // IP address exclusion
                // private & local networks
                "(?!10(?:\\.\\d{1,3}){3})" +
                "(?!127(?:\\.\\d{1,3}){3})" +
                "(?!169\\.254(?:\\.\\d{1,3}){2})" +
                "(?!192\\.168(?:\\.\\d{1,3}){2})" +
                "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
                // IP address dotted notation octets
                // excludes loopback network 0.0.0.0
                // excludes reserved space >= 224.0.0.0
                // excludes network & broacast addresses
                // (first & last IP address of each class)
                "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
                "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
                "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
                "|" +
                // host name
                "(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)" +
                // domain name
                "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*" +
                // TLD identifier
                "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
                ")" +
                // port number
                "(?::\\d{2,5})?" +
                // resource path
                "(?:/[^\\s]*)?" +
                "$", "i"
            );
            return urlExp.test($field.val());
        }
    };
}(window.jQuery));
;(function($) {
    $.fn.bootstrapValidator.validators.usZipCode = {
        /**
         * Return true if and only if the input value is a valid US zip code
         *
         * @param {BootstrapValidator} validator The validator plugin instance
         * @param {jQuery} $field Field element
         * @param {Object} options
         * @returns {boolean}
         */
        validate: function(validateInstance, $field, options) {
            var value = $field.val();
            return /^\d{5}([\-]\d{4})?$/.test(value);
        }
    };
}(window.jQuery));
