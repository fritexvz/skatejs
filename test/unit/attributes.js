'use strict';

import helpers from '../lib/helpers';
import skate from '../../src/skate';

describe('Attribute listeners', function () {
  describe('default values', function () {
    it('should set a default value using the "value" option', function () {
      var tagName = helpers.safeTagName('my-el');
      var MyEl = skate(tagName.safe, {
        attributes: {
          test: {
            value: 'true'
          }
        }
      });

      new MyEl().getAttribute('test').should.equal('true');
    });

    it('should allow a callback to return a default value', function () {
      var tagName = helpers.safeTagName('my-el');
      var MyEl = skate(tagName.safe, {
        attributes: {
          test: {
            value: function () {
              return 'true';
            }
          }
        }
      });

      new MyEl().getAttribute('test').should.equal('true');
    });

    it('should not override if already specified', function () {
      var tagName = helpers.safeTagName('my-el');

      skate(tagName.safe, {
        attributes: {
          test: {
            value: 'true'
          }
        }
      });

      skate.init(helpers.fixture('<my-el test="false"></my-el>', tagName))
        .firstChild
        .test
        .should
        .equal('false');
    });
  });

  describe('should define properties for all watched attributes', function () {
    var myEl;
    var created = false;
    var updated = false;
    var removed = false;

    beforeEach(function () {
      var tagName = helpers.safeTagName('my-el');
      var MyEl = skate(tagName.safe, {
        attributes: {
          camelCased: {
            value: 'true'
          },
          'not-camel-cased': {
            value: 'true'
          },
          'test-proxy': {},
          'test-created': {
            value: 'true',
            created: function () {
              created = true;
            }
          },
          'test-lifecycle': {
            created: function () {
              created = true;
            },
            updated: function () {
              updated = true;
            },
            removed: function () {
              removed = true;
            }
          },
          'override': {
            value: 'false'
          }
        },
        prototype: {
          override: 'true'
        }
      });

      myEl = new MyEl();
    });

    it('should respect attributes that are already camel-cased', function () {
      myEl.camelCased.should.equal('true');
    });

    it('should camel-case the property name and leave the attribute name as is', function () {
      myEl.notCamelCased.should.equal('true');
    });

    it('should set the attribute when the property is set', function () {
      myEl.setAttribute('test-proxy', false);
      myEl.testProxy.should.equal('false');
    });

    it('should set the property when the attribute is set', function () {
      myEl.testProxy = true;
      myEl.getAttribute('test-proxy').should.equal('true');
    });

    it('should call created after setting the default value', function (done) {
      helpers.afterMutations(function () {
        myEl.testCreated.should.equal('true');
        created.should.equal(true);
        done();
      });
    });

    it('should call created when the attribute is set for the first time', function (done) {
      myEl.testLifecycle = true;
      helpers.afterMutations(function () {
        myEl.testLifecycle.should.equal('true');
        created.should.equal(true);
        done();
      });
    });

    it('should call updated when the attribute is subsequently set', function (done) {
      myEl.testLifecycle = true;
      myEl.testLifecycle = false;
      helpers.afterMutations(function () {
        updated.should.equal(true);
        done();
      });
    });

    it('should call removed when the attribute is set to "undefined".', function (done) {
      myEl.testLifecycle = true;
      myEl.testLifecycle = undefined;
      helpers.afterMutations(function () {
        removed.should.equal(true);
        done();
      });
    });

    it('should not override an existing property', function (done) {
      myEl.setAttribute('override', 'false');
      helpers.afterMutations(function () {
        myEl.override.should.equal('true');
        done();
      });
    });
  });

  describe('callbacks', function () {
    describe('should listen to changes in specified attributes', function () {
      function createAttributeDefinition (done) {
        return {
          test: {
            created: function (element, data) {
              expect(data.oldValue).to.equal(null);
              data.newValue.should.equal('created');
            },
            updated: function (element, data) {
              data.oldValue.should.equal('created');
              data.newValue.should.equal('updated');
            },
            removed: function (element, data) {
              data.oldValue.should.equal('updated');
              expect(data.newValue).to.equal(null);
              done();
            }
          }
        };
      }

      function assertAttributeChanges (element) {
        helpers.afterMutations(function () {
          element.setAttribute('test', 'created');
          helpers.afterMutations(function () {
            element.setAttribute('test', 'updated');
            helpers.afterMutations(function () {
              element.removeAttribute('test');
            });
          });
        });
      }

      it('for native custom elements', function (done) {
        var Element = skate(helpers.safeTagName('my-el').safe, {
          attributes: createAttributeDefinition(done)
        });

        assertAttributeChanges(new Element());
      });

      it('for existing elements (via mutation observer)', function (done) {
        var { safe: id } = helpers.safeTagName('element');

        skate(id, {
          attributes: createAttributeDefinition(done)
        });

        assertAttributeChanges(helpers.fixture(`<${id}></${id}>`).querySelector(id));
      });

      it('for attributes (via mutation observer)', function (done) {
        var { safe: id } = helpers.safeTagName('attribute');

        skate(id, {
          type: skate.type.ATTRIBUTE,
          attributes: createAttributeDefinition(done)
        });

        assertAttributeChanges(helpers.fixture(`<div ${id}></div>`).querySelector('div'));
      });

      it('for classnames (via mutation observer)', function (done) {
        var { safe: id } = helpers.safeTagName('classname');

        skate(id, {
          type: skate.type.CLASSNAME,
          attributes: createAttributeDefinition(done)
        });

        assertAttributeChanges(helpers.fixture(`<div class="${id}"></div>`).querySelector('div'));
      });
    });

    it('should accept a function insead of an object for a particular attribute definition.', function (done) {
      var tagName = helpers.safeTagName('my-el');
      var MyEl = skate(tagName.safe, {
        attributes: {
          test: function (element, data) {
            if (data.type === 'created') {
              expect(data.oldValue).to.equal(null);
              data.newValue.should.equal('created');
            } else if (data.type === 'updated') {
              data.oldValue.should.equal('created');
              data.newValue.should.equal('updated');
            } else if (data.type === 'removed') {
              data.oldValue.should.equal('updated');
              expect(data.newValue).to.equal(null);
              done();
            }
          }
        }
      });

      var myEl = new MyEl();
      myEl.setAttribute('test', 'created');
      helpers.afterMutations(function () {
        myEl.setAttribute('test', 'updated');
        helpers.afterMutations(function () {
          myEl.removeAttribute('test');
        });
      });
    });

    it('should accept a function insead of an object for the entire attribute definition.', function (done) {
      var tagName = helpers.safeTagName('my-el');
      var MyEl = skate(tagName.safe, {
        attributes: function (element, data) {
          if (data.name !== 'test') {
            return;
          }

          if (data.type === 'created') {
            expect(data.oldValue).to.equal(null);
            data.newValue.should.equal('created');
          } else if (data.type === 'updated') {
            data.oldValue.should.equal('created');
            data.newValue.should.equal('updated');
          } else if (data.type === 'removed') {
            data.oldValue.should.equal('updated');
            expect(data.newValue).to.equal(null);
            done();
          }
        }
      });

      var myEl = new MyEl();
      myEl.setAttribute('test', 'created');
      helpers.afterMutations(function () {
        myEl.setAttribute('test', 'updated');
        helpers.afterMutations(function () {
          myEl.removeAttribute('test');
        });
      });
    });

    describe('should allow a fallback callback to be specified that catches all changes (same as passing a function instead of an object)', function () {
      function assertAttributeLifeycleCalls(expectedNumCalls, nonFallbackHandlers, done) {
        var called = 0;
        var tagName = helpers.safeTagName('my-el');
        var testHandlers = {
          fallback: function () {
            ++called;
          }
        };
        nonFallbackHandlers.forEach(function (item) {
          testHandlers[item] = function () {};
        });

        var MyEl = skate(tagName.safe, {
          attributes: {
            test: testHandlers
          }
        });

        var myEl = new MyEl();
        myEl.test = false;
        helpers.afterMutations(function () {
          myEl.test = true;
          helpers.afterMutations(function () {
            myEl.test = undefined;
            helpers.afterMutations(function () {
              called.should.equal(expectedNumCalls);
              done();
            });
          });
        });
      }

      it('fallback only', function (done) {
        assertAttributeLifeycleCalls(3, [], done);
      });

      it('created + fallback', function (done) {
        assertAttributeLifeycleCalls(2, ['created'], done);
      });

      it('updated + fallback', function (done) {
        assertAttributeLifeycleCalls(2, ['updated'], done);
      });

      it('removed + fallback', function (done) {
        assertAttributeLifeycleCalls(2, ['removed'], done);
      });
    });
  });

  describe('Attributes added via HTML', function () {
    it('should ensure attributes are initialised', function () {
      var called = false;
      var tagName = helpers.safeTagName('my-el');

      skate(tagName.safe, {
        attributes: function () {
          called = true;
        }
      });

      skate.init(helpers.fixture('<my-el some-attr></my-el>', tagName));
      expect(called).to.equal(true);
    });
  });

  describe('side effects', function () {
    it('should ensure an attribute exists before trying to action it just in case another attribute handler removes it', function () {
      var tagName = helpers.safeTagName('my-el');

      skate(tagName.safe, {
        attributes: function (element, data) {
          if (data.name === 'first') {
            element.removeAttribute('second');
          }
        }
      });

      skate.init(helpers.fixture('<my-el first></my-el>', tagName));
      document.querySelector(tagName.safe).hasAttribute('first').should.equal(true);
      document.querySelector(tagName.safe).hasAttribute('second').should.equal(false);
    });

    it('should iterate over every attribute even if one removed while it is still being processed', function () {
      var attributesCalled = 0;
      var tagName = helpers.safeTagName('my-el');

      skate(tagName.safe, {
        attributes: {
          id: {
            created: function (element) {
              element.removeAttribute('id');
              attributesCalled++;
            }
          },
          name: {
            created: function (element) {
              element.removeAttribute('name');
              attributesCalled++;
            }
          }
        }
      });

      skate.init(helpers.fixture('<my-el id="test" name="name"></my-el>', tagName));
      expect(attributesCalled).to.equal(2);
    });
  });
});
