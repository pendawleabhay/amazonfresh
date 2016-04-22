/**
 * Created by Chinmay on 16-04-2016.
 */

var MongoDB = require("../commons/mongodbhandler");
var Utilities = require("../commons/utilities");
var PasswordManager = require("../authentication/passwordmanager");
var Q = require("q");
var UserTypes = require("../commons/constants").usertypes;
var GoogleMaps = require("../commons/googlemapshandler");

exports.signup = function(info)
{
    var deferred = Q.defer();
    var promise = _validateCustomerInfo(info);
	var address = info.address + "," + info.city + "," + info.state + "," + info.zipCode;
	var promise1 = GoogleMaps.getLatLang(address);
    Q.all([promise, promise1]).done(function (values) {
        info = _sanitizeCustomerInfo(info);
		info.location = values[1];
		var cursor = MongoDB.collection("users").insert(info);
        cursor.then(function (user) {
            deferred.resolve(user);
        }).catch(function (error) {
            deferred.reject(error);
        });
    },function (error) {
        deferred.reject(error);
    });
    return deferred.promise;

};

/**
 * deletes a customer with given ssn from the system.
 * @param ssn
 * @returns {*|promise}
 */
exports.deleteCustomer = function (ssn) {

    var deferred = Q.defer();
    MongoDB.collection("users").remove({
        "ssn": ssn
    }, function (err, numberOfRemoved) {
        if(err) {
            deferred.reject(err);
        }
        if(numberOfRemoved.result.n) {
            deferred.resolve();
        } else {
            deferred.reject("Customer with given SSN not found in system!");
        }
    });
    return deferred.promise;
}

/**
 * Get list of all the customer with given ssn from the system.

 */
exports.getCustomersList = function()
{
    console.log("In get list function");
    var customers = [];
    var deferred = Q.defer();
    var cursor = MongoDB.collection("users").find({"usertype" : "CUSTOMER"});
    if(cursor != null)
    {
        cursor.each(function(err,doc){
            if(err)
            {
                deferred.reject("Error is - "+err);
            }
            else if(doc != null)
            {
                customers = customers.concat(doc);
            }
            else
            {
                deferred.resolve(customers);
            }
        });
    }
    else
    {
        deferred.reject("There are no Records for Customers");
    }
    return deferred.promise;
}


_validateCustomerInfo = function (info) {
    var deferred = Q.defer();
    var promise = Utilities.validateEmail(info.email);
    var promise1 = Utilities.validateSSN(info.ssn);
    Q.all([promise, promise1]).done(function () {
        if( Utilities.isEmpty(info.ssn)		 	||
            Utilities.isEmpty(info.firstName) 	||
            Utilities.isEmpty(info.lastName) 	||
            Utilities.isEmpty(info.address)	 	||
            Utilities.isEmpty(info.city) 		||
            Utilities.isEmpty(info.state) 		||
            Utilities.isEmpty(info.zipCode) 	||
            Utilities.isEmpty(info.phoneNumber) ||
            Utilities.isEmpty(info.password) 	||
            Utilities.isEmpty(info.email))
        {
            deferred.reject("All values must be provided! ");
        } else {
            if(!Utilities.validateState(info.state)) {
                deferred.reject("Invalid state!");
            } else
            if(!Utilities.validateZipCode(info.zipCode)) {
                deferred.reject("Invalid zip code!");
            }
            else
            {
                deferred.resolve();
            }
        }
    }, function (error) {
        deferred.reject(error);
    });
    return deferred.promise;
}

_sanitizeCustomerInfo = function (info) {
    console.log("In cust sanitize");
    info.password = PasswordManager.encryptPassword(info.password);
    info.usertype = UserTypes.CUSTOMER;
	info.isApproved = false;
    return info;
}