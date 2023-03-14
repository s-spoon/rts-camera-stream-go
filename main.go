package main

import (
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func handleSignals(sigs chan os.Signal, wg *sync.WaitGroup) {
	defer wg.Done()
	sig := <-sigs
	log.Println(sig)
}

func main() {
	var wg sync.WaitGroup
	wg.Add(3) // For signals, HTTP, Streams.

	go serveHTTP(&wg)
	go serveStreams(&wg)

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		handleSignals(sigs, &wg)
	}()

	log.Println("Server Start Awaiting Signal")
	wg.Wait()
	log.Println("Exiting")
}
