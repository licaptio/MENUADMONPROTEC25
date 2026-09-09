package com.provsoft.recordatorios.ui

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import io.getstream.photoview.PhotoView

class ImageViewerActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val imageUrl = intent.getStringExtra("image_url")

        if (imageUrl.isNullOrBlank()) {
            finish()
            return
        }

        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)

            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val photoView = PhotoView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )

            minimumScale = 1f
            mediumScale = 2.5f
            maximumScale = 6f
        }

        val btnCerrar = ImageButton(this).apply {
            setImageResource(
                android.R.drawable.ic_menu_close_clear_cancel
            )

            setBackgroundColor(Color.TRANSPARENT)
            setColorFilter(Color.WHITE)
            contentDescription = "Cerrar imagen"

            layoutParams = FrameLayout.LayoutParams(
                120,
                120
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                topMargin = 32
                marginEnd = 32
            }

            setOnClickListener {
                finish()
            }
        }

        root.addView(photoView)
        root.addView(btnCerrar)

        setContentView(root)

        Glide.with(this)
            .load(imageUrl)
            .fitCenter()
            .into(photoView)
    }
}