package com.example.waiter_app.services

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/**
 * Central REST API client for the Smart Inventory backend.
 *
 * Replaces all direct Firestore calls with HTTP requests through the backend API.
 * This is the proper architecture for a POS integration — just like Toast, Square,
 * or OpenTable would connect to a restaurant's system via API, not direct DB access.
 *
 * Usage:
 *   1. Call ApiClient.login(email, password) after Firebase Auth succeeds
 *   2. The JWT token is stored and sent with every subsequent request
 *   3. All methods use callbacks (onSuccess/onError) to match Android async patterns
 *
 * @author Nicolas Boggioni Troncoso & Fernando Moraes
 */
object ApiClient {

    // For Android emulator, 10.0.2.2 maps to the host machine's localhost
    // Change this to your actual server IP when testing on a real device
    private const val BASE_URL = "http://10.0.2.2:5000/api"

    private val client = OkHttpClient()
    private val gson = Gson()
    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

    // JWT token obtained from /api/auth/login
    private var authToken: String? = null

    /**
     * Set the JWT token (called after successful login)
     */
    fun setToken(token: String) {
        authToken = token
    }

    /**
     * Clear the token (called on logout)
     */
    fun clearToken() {
        authToken = null
    }

    /**
     * Check if we have a valid API token
     */
    fun hasToken(): Boolean {
        return authToken != null
    }

    // ─── Authentication ──────────────────────────────────────────

    /**
     * Login to the backend API and obtain a JWT token.
     * Call this AFTER Firebase Auth succeeds with the same credentials.
     */
    fun login(
        email: String,
        password: String,
        onSuccess: (token: String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val body = gson.toJson(mapOf("email" to email, "password" to password))

        post("/auth/login", body, skipAuth = true) { response ->
            try {
                val data = parseResponse(response)
                val token = (data["data"] as? Map<*, *>)?.get("token") as? String
                if (token != null) {
                    authToken = token
                    onSuccess(token)
                } else {
                    onError(Exception("No token in response"))
                }
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    // ─── Tables ──────────────────────────────────────────────────

    /**
     * GET /api/tables?active=true
     * Returns list of active table names
     */
    fun getTables(
        onSuccess: (List<Map<String, Any>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        get("/tables?active=true") { response ->
            try {
                val data = parseResponse(response)
                val tables = parseList(data["data"])
                onSuccess(tables)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    // ─── Menu Items ──────────────────────────────────────────────

    /**
     * GET /api/menu-items?active=true
     * Returns menu items with stockInfo (servingsLeft, available, lowStock)
     */
    fun getMenuItems(
        onSuccess: (List<Map<String, Any>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        get("/menu-items?active=true") { response ->
            try {
                val data = parseResponse(response)
                val items = parseList(data["data"])
                onSuccess(items)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    // ─── Orders ──────────────────────────────────────────────────

    /**
     * GET /api/orders — generic order listing with optional filters
     */
    fun getOrders(
        table: String? = null,
        status: String? = null,
        onSuccess: (List<Map<String, Any>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val params = mutableListOf<String>()
        table?.let { params.add("table=${java.net.URLEncoder.encode(it, "UTF-8")}") }
        status?.let { params.add("status=$it") }
        val query = if (params.isNotEmpty()) "?${params.joinToString("&")}" else ""

        get("/orders$query") { response ->
            try {
                val data = parseResponse(response)
                onSuccess(parseList(data["data"]))
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * GET /api/orders?table=X&status=open
     * Returns the first open order for a given table
     */
    fun getOpenOrder(
        tableId: String,
        onSuccess: (orderId: String?, orderData: Map<String, Any>?) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val encodedTable = java.net.URLEncoder.encode(tableId, "UTF-8")
        get("/orders?table=$encodedTable&status=open") { response ->
            try {
                val data = parseResponse(response)
                val orders = parseList(data["data"])
                if (orders.isNotEmpty()) {
                    val order = orders[0]
                    val id = order["id"] as? String
                    onSuccess(id, order)
                } else {
                    onSuccess(null, null)
                }
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * POST /api/orders — Create a new order for a table
     */
    fun createOrder(
        tableName: String,
        onSuccess: (orderId: String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val body = gson.toJson(mapOf("table" to tableName))

        post("/orders", body) { response ->
            try {
                val data = parseResponse(response)
                val orderData = data["data"] as? Map<*, *>
                val id = orderData?.get("id") as? String
                if (id != null) {
                    onSuccess(id)
                } else {
                    onError(Exception("No order ID in response"))
                }
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * GET /api/orders/:id — Get order with items and total
     */
    fun getOrderDetails(
        orderId: String,
        onSuccess: (order: Map<String, Any>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        get("/orders/$orderId") { response ->
            try {
                val data = parseResponse(response)
                val order = data["data"] as? Map<String, Any> ?: emptyMap()
                onSuccess(order)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * POST /api/orders/:id/items — Add item to order (auto-increments if exists)
     */
    fun addOrderItem(
        orderId: String,
        menuItemId: String,
        name: String,
        unitPrice: Double,
        qty: Int = 1,
        onSuccess: (message: String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val body = gson.toJson(mapOf(
            "menuItemId" to menuItemId,
            "name" to name,
            "unitPrice" to unitPrice,
            "qty" to qty
        ))

        post("/orders/$orderId/items", body) { response ->
            try {
                val data = parseResponse(response)
                val message = data["message"] as? String ?: "Item added"
                onSuccess(message)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * PUT /api/orders/:id/items/:itemId — Update an order item (qty)
     */
    fun updateOrderItem(
        orderId: String,
        itemId: String,
        qty: Int,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit
    ) {
        val body = gson.toJson(mapOf("qty" to qty))
        put("/orders/$orderId/items/$itemId", body) { response ->
            try {
                parseResponse(response)
                onSuccess()
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * DELETE /api/orders/:id/items/:itemId — Remove an item from order
     */
    fun deleteOrderItem(
        orderId: String,
        itemId: String,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit
    ) {
        delete("/orders/$orderId/items/$itemId") { response ->
            try {
                parseResponse(response)
                onSuccess()
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * DELETE /api/orders/:id — Delete an order (clear order)
     * Note: uses items deletion + order status update via finalize or direct delete
     */
    fun deleteOrder(
        orderId: String,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit
    ) {
        // Delete all items then the order itself
        // For now we delete item by item isn't practical, so we use a simple approach
        delete("/orders/$orderId") { response ->
            try {
                parseResponse(response)
                onSuccess()
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    /**
     * POST /api/orders/:id/finalize — Close order and deduct inventory
     * Returns warnings if stock is low
     */
    fun finalizeOrder(
        orderId: String,
        onSuccess: (warnings: List<Map<String, Any>>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        post("/orders/$orderId/finalize", "{}") { response ->
            try {
                val data = parseResponse(response)
                val success = data["success"] as? Boolean ?: false

                if (!success) {
                    val error = data["error"] as? String ?: "Finalization failed"
                    onError(Exception(error))
                    return@post
                }

                val resultData = data["data"] as? Map<*, *> ?: emptyMap<String, Any>()
                val warnings = parseList(resultData["warnings"])
                onSuccess(warnings)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    // ─── HTTP Helpers ────────────────────────────────────────────

    private fun get(path: String, callback: (Response) -> Unit) {
        val requestBuilder = Request.Builder()
            .url("$BASE_URL$path")
            .get()

        authToken?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }

        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                throw e
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response)
            }
        })
    }

    private fun put(path: String, jsonBody: String, callback: (Response) -> Unit) {
        val requestBuilder = Request.Builder()
            .url("$BASE_URL$path")
            .put(jsonBody.toRequestBody(JSON_MEDIA))

        authToken?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }

        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                throw e
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response)
            }
        })
    }

    private fun delete(path: String, callback: (Response) -> Unit) {
        val requestBuilder = Request.Builder()
            .url("$BASE_URL$path")
            .delete()

        authToken?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
        }

        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                throw e
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response)
            }
        })
    }

    private fun post(path: String, jsonBody: String, skipAuth: Boolean = false, callback: (Response) -> Unit) {
        val requestBuilder = Request.Builder()
            .url("$BASE_URL$path")
            .post(jsonBody.toRequestBody(JSON_MEDIA))

        if (!skipAuth) {
            authToken?.let {
                requestBuilder.addHeader("Authorization", "Bearer $it")
            }
        }

        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                throw e
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response)
            }
        })
    }

    /**
     * Parse a JSON response body into a Map
     */
    private fun parseResponse(response: Response): Map<String, Any> {
        val body = response.body?.string() ?: "{}"
        val type = object : TypeToken<Map<String, Any>>() {}.type
        val parsed: Map<String, Any> = gson.fromJson(body, type)

        // If the API returned an error, throw it
        val success = parsed["success"] as? Boolean ?: false
        if (!success && response.code >= 400) {
            val error = parsed["error"] as? String ?: "API error (${response.code})"
            throw Exception(error)
        }

        return parsed
    }

    /**
     * Safely parse a list from the response data
     */
    @Suppress("UNCHECKED_CAST")
    private fun parseList(data: Any?): List<Map<String, Any>> {
        return (data as? List<Map<String, Any>>) ?: emptyList()
    }
}
