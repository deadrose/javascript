/**
 * @fileoverview Email share view.
 * @author Erik Kallevig <ekallevig@gannett.com>
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'pubsub',
    'baseview',
    'state',
    'utils',
    'form/input-field'
],
function(
    $,
    _, 
    Backbone,
    PubSub,
    BaseView,
    StateManager,
    Utils,
    InputField
) {

    /**
     * View class.
     */
    var ShareEmail = BaseView.extend({

        // Events.
        events: {
            'submit .util-bar-share-form-email': 'onSubmitEmailForm',
            'click .recaptcha_option': 'onRecaptcha',
            'click .util-bar-email-cancel-btn': 'onClickCancelBtn',
            'click .util-bar-email-send-btn': 'onClickSendBtn'
        },

        /**
         * Initialize view.
         */
        initialize: function(options) {
            this.subviews = {};
            _.bindAll(this, 'initInputs');
            this.initInputs();
            this.$emailForm = this.$('.util-bar-share-form-email');
            if (this.$emailForm.length) {
                Utils.requireSingleUseScript('http://www.google.com/recaptcha/api/challenge?k=6Lf7fuESAAAAAJ3_KMIDbkQySsEE0vMkLXUkq4eY')
                    .done(_.delay(this.initInputs, 300));
            }
            BaseView.prototype.initialize.call(this, options);
        },

        initInputs: function() {
            this.$inputs = this.$$('.ui-text-input');
            _.each(this.$inputs, function($input, i) {
                if (this.subviews['input' + i]) {
                    this.subviews['input' + i].destroy();
                }
                this.subviews['input' + i] = new InputField({
                    el: $input
                });
            }, this);
        },

        /**
         * Click handler for 'send' button.
         */
        onClickSendBtn: function(e) {
            this.$emailForm.trigger('submit');
        },

        /**
         * Submit handler for 'email' form.
         */
        onSubmitEmailForm: function(e) {
            e.preventDefault();
            var $recaptchaWidget = this.$('#recaptcha_response_field');
            if (this.isValid(this.$emailForm)) {
                $.ajax({
                    type: 'POST',
                    url: this.$emailForm.attr('action'),
                    data: this.$emailForm.serialize()
                }).done(_.bind(function(response) {
                    this.$('.util-bar-flyout-section-email').hide();
                    this.$('.util-bar-flyout-pane-success-email').show();
                    this.$('.util-bar-flyout-pane-email-success').show();
                    PubSub.trigger('uotrack', 'UtilityBarShareEmail');
                    // console.log('submit response', response);
                    // TODO: Add error checking when endpoint is fixed.
                    // TODO: Add stock text/link to email body.
                }, this)).fail(_.bind(function(response){
                    $recaptchaWidget.addClass('error');
                    window.Recaptcha.reload();
                }, this));
            }
        },

        /**
         * Validate email form.
         */
        isValid: function($form) {
            // TODO: Add validation for email addresses if possible.
            var valid = true;
            $form.children('input,textarea').removeClass('error').each(function(index, el) {
                var $el = $(el);
                if ($el.hasClass('required') && $el.val() === '') {
                    $el.addClass('error');
                    valid = false;
                }
            });
            return valid ? true : false;
        },

        /**
         * Click handler for 'cancel' button.
         */
        onClickCancelBtn: function(e) {
            StateManager.getActiveApp().$('.util-bar-btn-email').trigger('click');
        },

        onRecaptcha: function(e) {
            var recaptchaOption = $(e.currentTarget).data('option'),
                commandTable = {
                reload: _.bind(function(){
                    window.Recaptcha.reload(); 
                    this.initInputs();
                }, this),
                audio:  function(){window.Recaptcha.switch_type('audio');},
                image:  function(){window.Recaptcha.switch_type('image');},
                help:   function(){window.Recaptcha.showhelp();}
            };
            commandTable[recaptchaOption]();
        }
    });

    /**
     * Return view class.
     */
    return ShareEmail;
});
